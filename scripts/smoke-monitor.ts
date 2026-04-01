import "dotenv/config"
import Redis from "ioredis"
import { Bot } from "grammy"
import { createClient } from "@supabase/supabase-js"
import {
  probeHealth,
  probeRedis,
  probeDatabase,
  probePriceWorker,
  probeBybitWorker,
  probeTelegramBot,
  probeSignalsCheck,
  probePricesEndpoint,
  probeCandleCache,
  probeActiveStrategies,
  type ProbeResult,
} from "./smoke-probes"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const CRON_SECRET = process.env.CRON_SECRET ?? ""
const SMOKE_CHAT_ID = process.env.SMOKE_CHAT_ID ?? process.env.TELEGRAM_ADMIN_CHAT_ID ?? ""

const TIMEOUT_MS = 10_000
const HEAVY_TIMEOUT_MS = 30_000

const withTimeout = (promise: Promise<ProbeResult>, ms: number, name: string): Promise<ProbeResult> => {
  const timeout = new Promise<ProbeResult>((resolve) =>
    setTimeout(() => resolve({ name, ok: false, reason: `Probe timed out after ${ms}ms`, durationMs: ms }), ms),
  )
  return Promise.race([promise, timeout])
}

const withRetry = async (fn: () => Promise<ProbeResult>, retries = 2, delayMs = 1000): Promise<ProbeResult> => {
  let result = await fn()
  for (let i = 0; i < retries && !result.ok; i++) {
    await new Promise((r) => setTimeout(r, delayMs))
    result = await fn()
  }
  return result
}

export const runSmoke = async (): Promise<void> => {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

  const results: ProbeResult[] = await Promise.all([
    withTimeout(probeHealth(APP_URL), TIMEOUT_MS, "health"),
    withTimeout(probeRedis(redis), TIMEOUT_MS, "redis"),
    withTimeout(withRetry(() => probeDatabase(supabase)), TIMEOUT_MS, "database"),
    withTimeout(probePriceWorker(redis), TIMEOUT_MS, "price-worker"),
    withTimeout(probeBybitWorker(redis), TIMEOUT_MS, "bybit-worker"),
    withTimeout(probeTelegramBot(redis), TIMEOUT_MS, "telegram-bot"),
    withTimeout(probeSignalsCheck(APP_URL, CRON_SECRET), HEAVY_TIMEOUT_MS, "signals-check"),
    withTimeout(probePricesEndpoint(APP_URL), TIMEOUT_MS, "prices-endpoint"),
    withTimeout(probeCandleCache(redis), TIMEOUT_MS, "candle-cache"),
    withTimeout(withRetry(() => probeActiveStrategies(supabase)), TIMEOUT_MS, "active-strategies"),
  ])

  const failed = results.filter((r) => !r.ok)
  const passed = results.filter((r) => r.ok)

  console.log(`[Smoke] ${passed.length}/${results.length} probes passed`)
  for (const r of results) {
    const status = r.ok ? "OK" : "FAIL"
    console.log(`  [${status}] ${r.name} (${r.durationMs}ms)${r.reason ? ` — ${r.reason}` : ""}`)
  }

  if (failed.length > 0 && SMOKE_CHAT_ID) {
    const lines = failed.map((r) => `- *${r.name}*: ${r.reason ?? "failed"}`)
    const message = `*Smoke Monitor Alert*\n${failed.length} probe(s) failed:\n${lines.join("\n")}`
    await bot.api.sendMessage(SMOKE_CHAT_ID, message, { parse_mode: "Markdown" })
  }

  redis.disconnect()
}

runSmoke().then(() => process.exit(0)).catch(() => process.exit(1))
