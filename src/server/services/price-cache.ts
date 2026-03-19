import { redis } from "@/lib/redis"

const PRICE_PREFIX = "price:"
const CANDLE_PREFIX = "candles:"
const PRICE_TTL = 300
const CANDLE_TTL_MAP: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
  "1w": 604800,
  "1M": 2592000,
}

type CachedCandle = {
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: string
}

export class PriceCache {
  async setPrice(instrumentId: string, price: number): Promise<void> {
    await redis.set(
      `${PRICE_PREFIX}${instrumentId}`,
      JSON.stringify({ price, updatedAt: Date.now() }),
      "EX",
      PRICE_TTL,
    )
  }

  async getPrice(instrumentId: string): Promise<number | null> {
    const data = await redis.get(`${PRICE_PREFIX}${instrumentId}`)
    if (!data) return null
    const parsed = JSON.parse(data) as { price: number }
    return parsed.price
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
}
