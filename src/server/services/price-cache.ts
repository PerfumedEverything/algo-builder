import { redis } from "@/lib/redis"

const PRICE_PREFIX = "price:"
const CANDLE_PREFIX = "candles:"
const PRICE_TTL = 120
const CANDLE_TTL_MAP: Record<string, number> = {
  "1m": 14400,
  "5m": 43200,
  "15m": 86400,
  "1h": 172800,
  "1d": 604800,
  "1w": 604800,
  "1M": 2592000,
}

export type CachedCandle = {
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: string
}

export class PriceCache {
  async setPrice(instrumentId: string, price: number): Promise<void> {
    const payload = JSON.stringify({ price, updatedAt: Date.now() })
    await redis.set(`${PRICE_PREFIX}${instrumentId}`, payload, "EX", PRICE_TTL)
  }

  async getPrice(instrumentId: string): Promise<number | null> {
    const data = await redis.get(`${PRICE_PREFIX}${instrumentId}`)
    if (data) return (JSON.parse(data) as { price: number }).price
    return null
  }

  async setCandles(
    instrumentId: string,
    interval: string,
    candles: CachedCandle[],
  ): Promise<void> {
    const ttl = CANDLE_TTL_MAP[interval] ?? 3600
    await redis.set(
      `${CANDLE_PREFIX}${instrumentId}:${interval}`,
      JSON.stringify(candles),
      "EX",
      ttl,
    )
  }

  async getCandles(
    instrumentId: string,
    interval: string,
  ): Promise<CachedCandle[] | null> {
    const data = await redis.get(`${CANDLE_PREFIX}${instrumentId}:${interval}`)
    if (!data) return null
    return JSON.parse(data) as CachedCandle[]
  }

  async publishPriceUpdate(instrumentId: string, price: number): Promise<void> {
    await redis.publish(
      "price-updates",
      JSON.stringify({ instrumentId, price, timestamp: Date.now() }),
    )
  }

  async getAllTrackedInstruments(): Promise<string[]> {
    const keys = await redis.keys(`${PRICE_PREFIX}*`)
    return keys.map((k) => k.replace(PRICE_PREFIX, ""))
  }

  async acquireLock(type: "strategy" | "signal", id: string): Promise<boolean> {
    const key = `lock:${type}:${id}`
    const result = await redis.set(key, "1", "EX", 10, "NX")
    return result === "OK"
  }

  async releaseLock(type: "strategy" | "signal", id: string): Promise<void> {
    const key = `lock:${type}:${id}`
    await redis.del(key)
  }

  async appendCandles(
    instrumentId: string,
    interval: string,
    newCandles: CachedCandle[],
  ): Promise<void> {
    const existing = (await this.getCandles(instrumentId, interval)) ?? []
    const lastTime = existing.at(-1)?.time ?? null
    const fresh = lastTime ? newCandles.filter((c) => c.time > lastTime) : newCandles
    if (fresh.length === 0) return
    await this.setCandles(instrumentId, interval, [...existing, ...fresh])
  }
}
