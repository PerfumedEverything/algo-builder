import { describe, it, expect } from "vitest"
import {
  normalizeMoexCandles,
  isInMoexSession,
  utcToMsk,
  MSK_OFFSET_MS,
  moexSessionStartUtcHour,
} from "@/server/services/candle-normalizer"
import { Candle } from "@/core/types/broker"

const makeCandle = (isoTime: string): Candle => ({
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 1000,
  time: new Date(isoTime),
})

describe("candle-normalizer", () => {
  describe("normalizeMoexCandles", () => {
    it("filters out Saturday candle", () => {
      const candles = [makeCandle("2026-03-28T12:00:00Z")]
      expect(normalizeMoexCandles(candles)).toHaveLength(0)
    })

    it("filters out Sunday candle", () => {
      const candles = [makeCandle("2026-03-29T12:00:00Z")]
      expect(normalizeMoexCandles(candles)).toHaveLength(0)
    })

    it("keeps main session candle", () => {
      const candles = [makeCandle("2026-03-27T08:00:00Z")]
      expect(normalizeMoexCandles(candles)).toHaveLength(1)
    })

    it("filters pre-market candle", () => {
      const candles = [makeCandle("2026-03-27T06:00:00Z")]
      expect(normalizeMoexCandles(candles)).toHaveLength(0)
    })

    it("filters post-main-session candle when includeEveningSession is false", () => {
      const candles = [makeCandle("2026-03-27T16:00:00Z")]
      expect(normalizeMoexCandles(candles, { includeEveningSession: false })).toHaveLength(0)
    })

    it("keeps evening session candle when enabled", () => {
      const candles = [makeCandle("2026-03-27T16:30:00Z")]
      expect(normalizeMoexCandles(candles, { includeEveningSession: true })).toHaveLength(1)
    })

    it("empty array returns empty", () => {
      expect(normalizeMoexCandles([])).toHaveLength(0)
    })
  })

  describe("utcToMsk", () => {
    it("adds 3 hours to UTC time", () => {
      const result = utcToMsk(new Date("2026-01-01T00:00:00Z"))
      expect(result.toISOString()).toBe("2026-01-01T03:00:00.000Z")
    })
  })

  describe("MSK_OFFSET_MS", () => {
    it("equals 3 hours in milliseconds", () => {
      expect(MSK_OFFSET_MS).toBe(10800000)
    })
  })

  describe("moexSessionStartUtcHour", () => {
    it("returns 7", () => {
      expect(moexSessionStartUtcHour()).toBe(7)
    })
  })

  describe("isInMoexSession", () => {
    it("returns true for candle at session boundary (10:00 MSK = 07:00 UTC)", () => {
      const date = new Date("2026-03-27T07:00:00Z")
      expect(isInMoexSession(date, { filterWeekends: true })).toBe(true)
    })

    it("returns false for candle just before main session (09:59 MSK = 06:59 UTC)", () => {
      const date = new Date("2026-03-27T06:59:00Z")
      expect(isInMoexSession(date, { filterWeekends: true })).toBe(false)
    })
  })
})
