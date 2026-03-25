import { describe, it, expect } from "vitest"
import { IndicatorCalculator } from "@/server/services/indicator-calculator"
import type { Candle } from "@/core/types"

function makeCandles(count: number): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    open: 100 + (i % 5),
    high: 100 + (i % 5) + 2,
    low: 100 + (i % 5) - 2,
    close: 100 + (i % 5) + 1,
    volume: 1000000,
    time: new Date(Date.now() + i * 60000),
  }))
}

describe("IndicatorCalculator — new indicators", () => {
  describe("calculateATR", () => {
    it("returns a positive number for 20 candles with period=14", () => {
      const result = IndicatorCalculator.calculateATR(makeCandles(20), 14)
      expect(result).not.toBeNull()
      expect(result).toBeGreaterThan(0)
    })

    it("returns null when candles.length < period + 1 (10 < 15 with period=14)", () => {
      expect(IndicatorCalculator.calculateATR(makeCandles(10), 14)).toBeNull()
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateATR([], 14)).toBeNull()
    })
  })

  describe("calculateStochastic", () => {
    it("returns a number in range 0-100 for 20 candles", () => {
      const result = IndicatorCalculator.calculateStochastic(makeCandles(20), 14, 3)
      expect(result).not.toBeNull()
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(100)
    })

    it("returns null when candles.length < period + signalPeriod (5 < 17 with period=14, signalPeriod=3)", () => {
      expect(IndicatorCalculator.calculateStochastic(makeCandles(5), 14, 3)).toBeNull()
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateStochastic([], 14, 3)).toBeNull()
    })
  })

  describe("calculateVWAP", () => {
    it("returns a positive number for 20 candles", () => {
      const result = IndicatorCalculator.calculateVWAP(makeCandles(20))
      expect(result).not.toBeNull()
      expect(result).toBeGreaterThan(0)
    })

    it("returns null when candles.length < 5 (3 < 5)", () => {
      expect(IndicatorCalculator.calculateVWAP(makeCandles(3))).toBeNull()
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateVWAP([])).toBeNull()
    })
  })

  describe("calculateWilliamsR", () => {
    it("returns a number in range -100 to 0 for 20 candles", () => {
      const result = IndicatorCalculator.calculateWilliamsR(makeCandles(20), 14)
      expect(result).not.toBeNull()
      expect(result).toBeGreaterThanOrEqual(-100)
      expect(result).toBeLessThanOrEqual(0)
    })

    it("returns null when candles.length < period + 1 (5 < 15 with period=14)", () => {
      expect(IndicatorCalculator.calculateWilliamsR(makeCandles(5), 14)).toBeNull()
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateWilliamsR([], 14)).toBeNull()
    })
  })
})
