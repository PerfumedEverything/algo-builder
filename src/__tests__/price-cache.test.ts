import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    publish: vi.fn(),
  },
}))

import { redis } from "@/lib/redis"
import { PriceCache } from "@/server/services/price-cache"

const PRICE_TTL = 120

const redisMock = redis as {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  del: ReturnType<typeof vi.fn>
  keys: ReturnType<typeof vi.fn>
  publish: ReturnType<typeof vi.fn>
}

describe("PriceCache", () => {
  let priceCache: PriceCache

  beforeEach(() => {
    vi.clearAllMocks()
    priceCache = new PriceCache()
  })

  describe("getPrice", () => {
    it("returns price from price: key when cache exists", async () => {
      redisMock.get.mockResolvedValueOnce(JSON.stringify({ price: 300, updatedAt: Date.now() }))

      const result = await priceCache.getPrice("SBER")

      expect(result).toBe(300)
      expect(redisMock.get).toHaveBeenCalledWith("price:SBER")
      expect(redisMock.get).toHaveBeenCalledTimes(1)
    })

    it("returns null when price: key expired — does NOT fallback to lastprice:", async () => {
      redisMock.get.mockResolvedValueOnce(null)

      const result = await priceCache.getPrice("SBER")

      expect(result).toBeNull()
      expect(redisMock.get).toHaveBeenCalledTimes(1)
      expect(redisMock.get).toHaveBeenCalledWith("price:SBER")
      const calledKeys = (redisMock.get.mock.calls as string[][]).map((c) => c[0])
      expect(calledKeys.some((k) => k.includes("lastprice"))).toBe(false)
    })
  })

  describe("setPrice", () => {
    it(`stores only in price: key with TTL ${PRICE_TTL} — does NOT set lastprice: key`, async () => {
      redisMock.set.mockResolvedValue("OK")

      await priceCache.setPrice("SBER", 300)

      expect(redisMock.set).toHaveBeenCalledTimes(1)
      const [key, , ttlFlag, ttlValue] = redisMock.set.mock.calls[0] as [string, string, string, number]
      expect(key).toBe("price:SBER")
      expect(ttlFlag).toBe("EX")
      expect(ttlValue).toBe(PRICE_TTL)
      const calledKeys = (redisMock.set.mock.calls as string[][]).map((c) => c[0])
      expect(calledKeys.some((k) => k.includes("lastprice"))).toBe(false)
    })
  })

  describe("acquireLock", () => {
    it('acquires lock with key lock:strategy:123, "EX", 10, "NX"', async () => {
      redisMock.set.mockResolvedValueOnce("OK")

      const result = await priceCache.acquireLock("strategy", "123")

      expect(result).toBe(true)
      expect(redisMock.set).toHaveBeenCalledWith("lock:strategy:123", "1", "EX", 10, "NX")
    })
  })

  describe("appendCandles", () => {
    it("appendCandles deduplicates by timestamp", async () => {
      const initial = [
        { open: 100, high: 110, low: 90, close: 105, volume: 1000, time: "2026-03-27T08:00:00.000Z" },
        { open: 105, high: 115, low: 95, close: 110, volume: 2000, time: "2026-03-27T08:01:00.000Z" },
      ]
      const newCandles = [
        { open: 105, high: 115, low: 95, close: 110, volume: 2000, time: "2026-03-27T08:01:00.000Z" },
        { open: 110, high: 120, low: 100, close: 115, volume: 3000, time: "2026-03-27T08:02:00.000Z" },
      ]
      redisMock.get.mockResolvedValueOnce(JSON.stringify(initial))
      redisMock.set.mockResolvedValue("OK")

      await priceCache.appendCandles("SBER", "1m", newCandles)

      const setCall = redisMock.set.mock.calls[0] as [string, string, string, number]
      const stored = JSON.parse(setCall[1]) as typeof initial
      expect(stored).toHaveLength(3)
      expect(stored[2].time).toBe("2026-03-27T08:02:00.000Z")
    })

    it("appendCandles creates cache if none exists", async () => {
      const newCandles = [
        { open: 100, high: 110, low: 90, close: 105, volume: 1000, time: "2026-03-27T08:00:00.000Z" },
      ]
      redisMock.get.mockResolvedValueOnce(null)
      redisMock.set.mockResolvedValue("OK")

      await priceCache.appendCandles("SBER", "1m", newCandles)

      const setCall = redisMock.set.mock.calls[0] as [string, string, string, number]
      const stored = JSON.parse(setCall[1]) as typeof newCandles
      expect(stored).toHaveLength(1)
      expect(stored[0].time).toBe("2026-03-27T08:00:00.000Z")
    })

    it("appendCandles does nothing when all candles already cached", async () => {
      const existing = [
        { open: 100, high: 110, low: 90, close: 105, volume: 1000, time: "2026-03-27T08:00:00.000Z" },
      ]
      redisMock.get.mockResolvedValueOnce(JSON.stringify(existing))

      await priceCache.appendCandles("SBER", "1m", existing)

      expect(redisMock.set).not.toHaveBeenCalled()
    })

    it("CANDLE_TTL_MAP 1m TTL is 14400 seconds", async () => {
      const candles = [
        { open: 100, high: 110, low: 90, close: 105, volume: 1000, time: "2026-03-27T08:00:00.000Z" },
      ]
      redisMock.set.mockResolvedValue("OK")

      await priceCache.setCandles("SBER", "1m", candles)

      const setCall = redisMock.set.mock.calls[0] as [string, string, string, number]
      expect(setCall[2]).toBe("EX")
      expect(setCall[3]).toBe(14400)
    })
  })
})
