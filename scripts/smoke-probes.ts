import "dotenv/config"
import type { default as RedisType } from "ioredis"
import type { SupabaseClient } from "@supabase/supabase-js"

export type ProbeResult = { name: string; ok: boolean; reason?: string; durationMs: number }

export const probeHealth = async (appUrl: string): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const res = await fetch(`${appUrl}/api/health`)
    const durationMs = Date.now() - start
    if (!res.ok) return { name: "health", ok: false, reason: `HTTP ${res.status}`, durationMs }
    const json = await res.json() as { ok?: boolean }
    if (!json.ok) return { name: "health", ok: false, reason: "ok:false in response", durationMs }
    return { name: "health", ok: true, durationMs }
  } catch (e) {
    return { name: "health", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probeRedis = async (redis: RedisType): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const pong = await redis.ping()
    const durationMs = Date.now() - start
    if (pong !== "PONG") return { name: "redis", ok: false, reason: `Unexpected: ${pong}`, durationMs }
    return { name: "redis", ok: true, durationMs }
  } catch (e) {
    return { name: "redis", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probeDatabase = async (supabase: SupabaseClient): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const { error } = await supabase.from("User").select("id").limit(1)
    const durationMs = Date.now() - start
    if (error) return { name: "database", ok: false, reason: error.message, durationMs }
    return { name: "database", ok: true, durationMs }
  } catch (e) {
    return { name: "database", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probePriceWorker = async (redis: RedisType): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const val = await redis.get("worker:heartbeat")
    const durationMs = Date.now() - start
    if (!val) return { name: "price-worker", ok: false, reason: "heartbeat key missing", durationMs }
    const age = Date.now() - parseInt(val, 10)
    if (age > 180_000) return { name: "price-worker", ok: false, reason: `stale ${age}ms`, durationMs }
    return { name: "price-worker", ok: true, durationMs }
  } catch (e) {
    return { name: "price-worker", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probeBybitWorker = async (redis: RedisType): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const val = await redis.get("bybit-worker:heartbeat")
    const durationMs = Date.now() - start
    if (!val) return { name: "bybit-worker", ok: true, reason: "bybit worker not enabled", durationMs }
    const age = Date.now() - parseInt(val, 10)
    if (age > 180_000) return { name: "bybit-worker", ok: false, reason: `stale ${age}ms`, durationMs }
    return { name: "bybit-worker", ok: true, durationMs }
  } catch (e) {
    return { name: "bybit-worker", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probeTelegramBot = async (redis: RedisType): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const val = await redis.get("telegram-bot:heartbeat")
    const durationMs = Date.now() - start
    if (val) {
      const age = Date.now() - parseInt(val, 10)
      if (age > 180_000) return { name: "telegram-bot", ok: false, reason: `stale ${age}ms`, durationMs }
      return { name: "telegram-bot", ok: true, durationMs }
    }
    return { name: "telegram-bot", ok: true, reason: "no heartbeat key — assumed ok", durationMs }
  } catch (e) {
    return { name: "telegram-bot", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probeSignalsCheck = async (appUrl: string, cronSecret: string): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const res = await fetch(`${appUrl}/api/signals/check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    const durationMs = Date.now() - start
    if (!res.ok) return { name: "signals-check", ok: false, reason: `HTTP ${res.status}`, durationMs }
    return { name: "signals-check", ok: true, durationMs }
  } catch (e) {
    return { name: "signals-check", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probePricesEndpoint = async (appUrl: string): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const res = await fetch(`${appUrl}/api/prices/stream`)
    const durationMs = Date.now() - start
    if (res.status >= 500) return { name: "prices-endpoint", ok: false, reason: `HTTP ${res.status}`, durationMs }
    return { name: "prices-endpoint", ok: true, durationMs }
  } catch (e) {
    return { name: "prices-endpoint", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probeCandleCache = async (redis: RedisType): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const keys = await redis.keys("candles:*")
    const durationMs = Date.now() - start
    if (keys.length === 0) return { name: "candle-cache", ok: false, reason: "no candle keys in Redis", durationMs }
    return { name: "candle-cache", ok: true, durationMs }
  } catch (e) {
    return { name: "candle-cache", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

export const probeActiveStrategies = async (supabase: SupabaseClient): Promise<ProbeResult> => {
  const start = Date.now()
  try {
    const { data, error } = await supabase.from("Strategy").select("id").eq("status", "ACTIVE")
    const durationMs = Date.now() - start
    if (error) return { name: "active-strategies", ok: false, reason: error.message, durationMs }
    const count = data?.length ?? 0
    if (count === 0) return { name: "active-strategies", ok: false, reason: "no active strategies", durationMs }
    return { name: "active-strategies", ok: true, durationMs }
  } catch (e) {
    return { name: "active-strategies", ok: false, reason: String(e), durationMs: Date.now() - start }
  }
}

