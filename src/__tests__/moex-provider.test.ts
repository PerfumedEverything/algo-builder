import { describe, it, expect, vi, beforeEach } from "vitest"
import { MOEXProvider } from "@/server/providers/analytics"

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { redis } from "@/lib/redis"

const mockRedisGet = vi.mocked(redis.get)
const mockRedisSet = vi.mocked(redis.set)

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("MOEXProvider", () => {
  let provider: MOEXProvider

  beforeEach(() => {
    provider = new MOEXProvider()
    vi.clearAllMocks()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue("OK")
  })

  describe("getImoexCandles", () => {
    it("maps response columns to MOEXCandle objects correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          candles: {
            columns: ["open", "close", "high", "low", "value", "volume", "begin", "end"],
            data: [
              [3099.78, 3101.31, 3124.63, 3068.25, 83234567890.12, 0, "2024-01-03 00:00:00", "2024-01-03 23:59:59"],
            ],
          },
        }),
      })

      const result = await provider.getImoexCandles("2024-01-01", "2024-01-05")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        open: 3099.78,
        close: 3101.31,
        high: 3124.63,
        low: 3068.25,
        value: 83234567890.12,
        volume: 0,
        begin: "2024-01-03 00:00:00",
        end: "2024-01-03 23:59:59",
      })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("iss.moex.com/iss/engines/stock/markets/index/securities/IMOEX/candles.json"),
      )
    })

    it("caches result in Redis with 24h TTL", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          candles: {
            columns: ["open", "close", "high", "low", "value", "volume", "begin", "end"],
            data: [[100, 101, 102, 99, 1000, 500, "2024-01-01 00:00:00", "2024-01-01 23:59:59"]],
          },
        }),
      })

      await provider.getImoexCandles("2024-01-01", "2024-01-02")

      expect(mockRedisSet).toHaveBeenCalledWith(
        "moex:imoex:candles:2024-01-01:2024-01-02",
        expect.any(String),
        "EX",
        86400,
      )
    })

    it("returns cached data without fetch on cache hit", async () => {
      const cached = [{ open: 100, close: 101, high: 102, low: 99, value: 1000, volume: 500, begin: "2024-01-01 00:00:00", end: "2024-01-01 23:59:59" }]
      mockRedisGet.mockResolvedValueOnce(JSON.stringify(cached))

      const result = await provider.getImoexCandles("2024-01-01", "2024-01-02")

      expect(result).toEqual(cached)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("getDividends", () => {
    it("maps response columns to DividendData objects correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          dividends: {
            columns: ["secid", "isin", "registryclosedate", "value", "currencyid"],
            data: [
              ["SBER", "RU0009029540", "2024-07-11", 33.3, "SUR"],
            ],
          },
        }),
      })

      const result = await provider.getDividends("SBER")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        secid: "SBER",
        isin: "RU0009029540",
        registryclosedate: "2024-07-11",
        value: 33.3,
        currencyid: "SUR",
      })
    })

    it("caches dividends with 7-day TTL", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          dividends: {
            columns: ["secid", "isin", "registryclosedate", "value", "currencyid"],
            data: [["SBER", "RU0009029540", "2024-07-11", 33.3, "SUR"]],
          },
        }),
      })

      await provider.getDividends("SBER")

      expect(mockRedisSet).toHaveBeenCalledWith(
        "moex:dividends:SBER",
        expect.any(String),
        "EX",
        604800,
      )
    })
  })

  describe("getHistoryWithPagination", () => {
    it("handles multi-page responses", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({
            history: {
              columns: ["date", "close"],
              data: Array.from({ length: 100 }, (_, i) => [`2024-01-${String(i + 1).padStart(2, "0")}`, 3000 + i]),
            },
            "history.cursor": {
              columns: ["INDEX", "TOTAL", "PAGESIZE"],
              data: [[0, 250, 100]],
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            history: {
              columns: ["date", "close"],
              data: Array.from({ length: 100 }, (_, i) => [`2024-04-${String(i + 1).padStart(2, "0")}`, 3100 + i]),
            },
            "history.cursor": {
              columns: ["INDEX", "TOTAL", "PAGESIZE"],
              data: [[100, 250, 100]],
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            history: {
              columns: ["date", "close"],
              data: Array.from({ length: 50 }, (_, i) => [`2024-07-${String(i + 1).padStart(2, "0")}`, 3200 + i]),
            },
            "history.cursor": {
              columns: ["INDEX", "TOTAL", "PAGESIZE"],
              data: [[200, 250, 100]],
            },
          }),
        })

      const result = await provider.getHistoryWithPagination("https://iss.moex.com/iss/history/engines/stock/markets/index/securities/IMOEX.json?from=2024-01-01&till=2024-12-31")

      expect(result).toHaveLength(250)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it("handles single-page response", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          history: {
            columns: ["date", "close"],
            data: [["2024-01-01", 3000], ["2024-01-02", 3010]],
          },
          "history.cursor": {
            columns: ["INDEX", "TOTAL", "PAGESIZE"],
            data: [[0, 2, 100]],
          },
        }),
      })

      const result = await provider.getHistoryWithPagination("https://iss.moex.com/iss/history/test")

      expect(result).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
