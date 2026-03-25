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
})
