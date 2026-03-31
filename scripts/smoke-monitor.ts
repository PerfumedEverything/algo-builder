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

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Probe timed out after ${ms}ms`)), ms),
  )
  return Promise.race([promise, timeout])
}

export const runSmoke = async (): Promise<void> => {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

  const TIMEOUT_MS = 10_000

  const settled = await Promise.allSettled([
    withTimeout(probeHealth(APP_URL), TIMEOUT_MS),
    withTimeout(probeRedis(redis), TIMEOUT_MS),
    withTimeout(probeDatabase(supabase), TIMEOUT_MS),
    withTimeout(probePriceWorker(redis), TIMEOUT_MS),
    withTimeout(probeBybitWorker(redis), TIMEOUT_MS),
    withTimeout(probeTelegramBot(redis), TIMEOUT_MS),
    withTimeout(probeSignalsCheck(APP_URL, CRON_SECRET), TIMEOUT_MS),
    withTimeout(probePricesEndpoint(APP_URL), TIMEOUT_MS),
    withTimeout(probeCandleCache(redis), TIMEOUT_MS),
    withTimeout(probeActiveStrategies(supabase), TIMEOUT_MS),
  ])

  const results: ProbeResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value
    return { name: `probe-${i}`, ok: false, reason: String(s.reason), durationMs: 0 }
  })

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
