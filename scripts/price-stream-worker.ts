import "dotenv/config"
import { TinkoffInvestApi } from "tinkoff-invest-api"
import Redis from "ioredis"
import { createClient } from "@supabase/supabase-js"
import { PREFERRED_CLASS_CODES } from "../src/lib/shared-constants"

const PRICE_PREFIX = "price:"
const CANDLE_PREFIX = "candles:"
const PRICE_TTL = 120
const INSTRUMENT_REFRESH_INTERVAL = 60_000
const CANDLE_REFRESH_INTERVAL = 60_000
const HEALTH_CHECK_INTERVAL = 30_000
const HEALTH_CHECK_MAX_STALE_MS = 120_000

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

const subscriberRedis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const systemToken = process.env.TINKOFF_SYSTEM_TOKEN
if (!systemToken) {
  console.error("[Worker] TINKOFF_SYSTEM_TOKEN is required")
  process.exit(1)
}

const api = new TinkoffInvestApi({ token: systemToken })

const toNumber = (q?: { units: number; nano: number }): number => {
  if (!q) return 0
  return Number((q.units + q.nano / 1_000_000_000).toFixed(9))
}

const stripTickerSuffix = (ticker: string): string => ticker.replace(/@$/, "")

let subscribedInstruments = new Set<string>()
let unsubscribeFn: (() => Promise<void>) | null = null
let lastPriceUpdate = Date.now()

async function getActiveInstruments(): Promise<string[]> {
  const [signals, strategies, requested] = await Promise.all([
    db.from("Signal").select("instrument").eq("isActive", true),
    db.from("Strategy").select("instrument").eq("status", "ACTIVE"),
    redis.smembers("requested-instruments"),
  ])

  const instruments = new Set<string>()
  for (const row of signals.data ?? []) instruments.add(row.instrument)
  for (const row of strategies.data ?? []) instruments.add(row.instrument)
  for (const ticker of requested) instruments.add(ticker)
  return [...instruments]
}

async function resolveTickerToUid(ticker: string): Promise<string> {
  if (ticker.includes("-") && ticker.length > 20) return ticker

  const { instruments } = await api.instruments.findInstrument({
    query: ticker.toUpperCase(),
  })

  const upperTicker = ticker.toUpperCase()
  const exact = instruments.filter((i) => i.ticker.toUpperCase() === upperTicker)

  const match =
    exact.find((i) => PREFERRED_CLASS_CODES.includes(i.classCode) && i.apiTradeAvailableFlag) ??
    exact.find((i) => PREFERRED_CLASS_CODES.includes(i.classCode)) ??
    exact.find((i) => i.apiTradeAvailableFlag) ??
    exact[0] ??
    instruments[0]

  if (match) return match.uid
  throw new Error(`Instrument "${ticker}" not found`)
}

const tickerToUidMap = new Map<string, string>()
const tickerToFigiMap = new Map<string, string>()

async function resolveAll(tickers: string[]): Promise<Map<string, string>> {
  for (const ticker of tickers) {
    if (!tickerToUidMap.has(ticker)) {
      try {
        const apiQuery = stripTickerSuffix(ticker)
        const { instruments } = await api.instruments.findInstrument({ query: apiQuery.toUpperCase() })
        const upperQuery = apiQuery.toUpperCase()
        const exact = instruments.filter((i) => stripTickerSuffix(i.ticker).toUpperCase() === upperQuery)

        const match =
          exact.find((i) => PREFERRED_CLASS_CODES.includes(i.classCode) && i.apiTradeAvailableFlag) ??
          exact.find((i) => PREFERRED_CLASS_CODES.includes(i.classCode)) ??
          exact.find((i) => i.apiTradeAvailableFlag) ??
          exact[0] ??
          instruments[0]

        if (match) {
          tickerToUidMap.set(ticker, match.uid)
          tickerToFigiMap.set(ticker, match.figi)
          console.log(`[Worker] Resolved ${ticker} → uid:${match.uid} figi:${match.figi}`)
        }
      } catch (e) {
        console.error(`[Worker] Failed to resolve ${ticker}:`, e)
      }
    }
  }
  return tickerToUidMap
}

async function subscribeToStream(instruments: string[]) {
  if (instruments.length === 0) {
    console.log("[Worker] No active instruments, skipping stream subscription")
    return
  }

  await resolveAll(instruments)
  const figiList = [...tickerToFigiMap.entries()].filter(([t]) => instruments.includes(t))

  if (figiList.length === 0) {
    console.log("[Worker] No resolved FIGIs, skipping")
    return
  }

  console.log(`[Worker] Subscribing to ${figiList.length} instruments...`)

  try {
  const streamPromise = api.stream.market.lastPrice(
    { instruments: figiList.map(([, f]) => ({ figi: f, instrumentId: f })) },
    async (lastPrice) => {
      lastPriceUpdate = Date.now()
      const price = toNumber(lastPrice.price)
      const responseFigi = lastPrice.figi || lastPrice.instrumentUid

      let ticker = responseFigi
      for (const [t, f] of tickerToFigiMap) {
        if (f === responseFigi) { ticker = t; break }
      }

      const payload = JSON.stringify({ price, updatedAt: Date.now() })
      await redis.set(`${PRICE_PREFIX}${ticker}`, payload, "EX", PRICE_TTL)

      await redis.publish(
        "price-updates",
        JSON.stringify({ instrumentId: ticker, price, timestamp: Date.now() }),
      )
    },
  )

  subscribedInstruments = new Set(instruments)
  console.log(`[Worker] Stream subscribed to: ${instruments.join(", ")}`)

  streamPromise.then((unsub) => {
    unsubscribeFn = unsub
  }).catch((e) => {
    console.error("[Worker] Stream ended unexpectedly:", e)
    unsubscribeFn = null
  })
  } catch (e) {
    console.error("[Worker] Stream subscription error:", e)
  }
}

async function healthCheck() {
  if (subscribedInstruments.size === 0) return

  const staleDuration = Date.now() - lastPriceUpdate
  if (staleDuration > HEALTH_CHECK_MAX_STALE_MS) {
    console.warn(`[Worker] Stream stale for ${Math.round(staleDuration / 1000)}s, reconnecting...`)
    if (unsubscribeFn) {
      try { await unsubscribeFn() } catch { /* stream may already be closed */ }
      unsubscribeFn = null
    }
    await subscribeToStream([...subscribedInstruments])
  }
}

async function refreshInstruments() {
  const current = await getActiveInstruments()
  const currentSet = new Set(current)

  const added = current.filter((i) => !subscribedInstruments.has(i))
  const removed = [...subscribedInstruments].filter((i) => !currentSet.has(i))

  if (added.length === 0 && removed.length === 0) return

  console.log(`[Worker] Instruments changed: +${added.length} -${removed.length}`)

  if (unsubscribeFn) {
    try { await unsubscribeFn() } catch { /* stream may already be closed */ }
    unsubscribeFn = null
  }

  await subscribeToStream(current)
}

const INTERVAL_MAP: Record<string, number> = {
  "1m": 2, "5m": 5, "15m": 15, "1h": 60, "1d": 1440,
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const getCandleRangeMs = (interval: string): number => {
  switch (interval) {
    case "1m": case "5m": case "15m": return DAY
    case "1h": return 7 * DAY
    default: return 365 * DAY
  }
}

const candleIntervalMap: Record<string, number> = {
  "1m": 1, "5m": 2, "15m": 3, "1h": 4, "1d": 5, "1w": 6, "1M": 7,
}

async function refreshCandles() {
  const instruments = [...subscribedInstruments]
  if (instruments.length === 0) return

  const [signals, strategies] = await Promise.all([
    db.from("Signal").select("instrument, timeframe").eq("isActive", true),
    db.from("Strategy").select("instrument, timeframe").eq("status", "ACTIVE"),
  ])

  const pairs = new Map<string, Set<string>>()
  for (const row of [...(signals.data ?? []), ...(strategies.data ?? [])]) {
    const tf = row.timeframe || "1d"
    if (!pairs.has(row.instrument)) pairs.set(row.instrument, new Set())
    pairs.get(row.instrument)!.add(tf)
  }

  const tasks: Array<{ ticker: string; tf: string; uid: string }> = []
  for (const [ticker, timeframes] of pairs) {
    const uid = tickerToUidMap.get(ticker)
    if (!uid) continue
    for (const tf of timeframes) {
      tasks.push({ ticker, tf, uid })
    }
  }

  const BATCH_SIZE = 5
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(async ({ ticker, tf, uid }) => {
      try {
        const now = new Date()
        const from = new Date(now.getTime() - getCandleRangeMs(tf))
        const interval = candleIntervalMap[tf] ?? 5

        const { candles } = await api.marketdata.getCandles({
          instrumentId: uid,
          from,
          to: now,
          interval,
        })

        const mapped = candles.map((c) => ({
          open: toNumber(c.open),
          high: toNumber(c.high),
          low: toNumber(c.low),
          close: toNumber(c.close),
          volume: Number(c.volume),
          time: c.time?.toISOString() ?? new Date().toISOString(),
        }))

        const ttlMap: Record<string, number> = {
          "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1d": 86400,
        }
        const ttl = ttlMap[tf] ?? 3600

        await redis.set(
          `${CANDLE_PREFIX}${ticker}:${tf}`,
          JSON.stringify(mapped),
          "EX",
          ttl,
        )
      } catch (e) {
        console.error(`[Worker] Candle fetch failed for ${ticker}:${tf}:`, e)
      }
    }))
  }
}

async function startSignalListener() {
  subscriberRedis.subscribe("price-updates")

  subscriberRedis.on("message", async (_channel, message) => {
    try {
      const { instrumentId, price } = JSON.parse(message) as {
        instrumentId: string
        price: number
      }

      const [signals, strategies] = await Promise.all([
        db.from("Signal").select("*").eq("isActive", true).eq("instrument", instrumentId),
        db.from("Strategy").select("*").eq("status", "ACTIVE").eq("instrument", instrumentId),
      ])

      const signalRows = signals.data ?? []
      const strategyRows = strategies.data ?? []

      if (signalRows.length === 0 && strategyRows.length === 0) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/signals/check-instrument`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({ instrumentId, price }),
        },
      )

      if (!response.ok) {
        console.error(`[Worker] Check-instrument failed: ${response.status}`)
      }
    } catch (e) {
      console.error("[Worker] Signal listener error:", e)
    }
  })
}

const CRON_CHECK_INTERVAL = 60_000

async function cronCheck() {
  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/signals/check`
    console.log("[Worker] Cron check running...")
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CRON_SECRET}`,
      },
    })
    if (!response.ok) {
      console.error(`[Worker] Cron check failed: ${response.status}`)
    } else {
      const data = await response.json()
      console.log(`[Worker] Cron check done:`, JSON.stringify(data).slice(0, 200))
    }
  } catch (e) {
    console.error("[Worker] Cron check error:", e)
  }
}

async function main() {
  console.log("[Worker] Starting price stream worker...")

  await redis.connect()
  await subscriberRedis.connect()
  console.log("[Worker] Redis connected")

  const instruments = await getActiveInstruments()
  console.log(`[Worker] Found ${instruments.length} active instruments`)

  await subscribeToStream(instruments)
  await refreshCandles()

  setInterval(() => refreshInstruments(), INSTRUMENT_REFRESH_INTERVAL)
  setInterval(() => refreshCandles(), CANDLE_REFRESH_INTERVAL)
  setInterval(() => healthCheck(), HEALTH_CHECK_INTERVAL)
  setInterval(() => cronCheck(), CRON_CHECK_INTERVAL)

  await startSignalListener()
  await cronCheck()

  console.log("[Worker] Ready. Listening for price updates...")
}

process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...")
  if (unsubscribeFn) await unsubscribeFn()
  redis.disconnect()
  subscriberRedis.disconnect()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...")
  if (unsubscribeFn) await unsubscribeFn()
  redis.disconnect()
  subscriberRedis.disconnect()
  process.exit(0)
})

main().catch((e) => {
  console.error("[Worker] Fatal error:", e)
  process.exit(1)
})
