import { describe, it, expect } from "vitest"
import { IndicatorCalculator } from "@/server/services/indicator-calculator"
import type { Candle } from "@/core/types"

function makeCandles(count: number): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    open: 100 + Math.sin(i) * 5,
    high: 105 + Math.sin(i) * 5,
    low: 95 + Math.sin(i) * 5,
    close: 100 + Math.cos(i) * 5,
    volume: 1000 + i * 10,
    time: new Date(Date.now() + i * 60000),
  }))
}

describe("IndicatorCalculator — null safety", () => {
  describe("calculateRSI", () => {
    it("returns null when candles.length < period + 1 (3 < 15)", () => {
      expect(IndicatorCalculator.calculateRSI(makeCandles(3), 14)).toBeNull()
    })

    it("returns a number when candles.length >= period + 1 (15 >= 15)", () => {
      const result = IndicatorCalculator.calculateRSI(makeCandles(15), 14)
      expect(result).not.toBeNull()
      expect(typeof result).toBe("number")
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateRSI([], 14)).toBeNull()
    })
  })

  describe("calculateSMA", () => {
    it("returns null when candles.length < period (5 < 20)", () => {
      expect(IndicatorCalculator.calculateSMA(makeCandles(5), 20)).toBeNull()
    })

    it("returns a number when candles.length >= period (20 >= 20)", () => {
      const result = IndicatorCalculator.calculateSMA(makeCandles(20), 20)
      expect(result).not.toBeNull()
      expect(typeof result).toBe("number")
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateSMA([], 20)).toBeNull()
    })
  })

  describe("calculateEMA", () => {
    it("returns null when candles.length < period (5 < 20)", () => {
      expect(IndicatorCalculator.calculateEMA(makeCandles(5), 20)).toBeNull()
    })

    it("returns a number when candles.length >= period (20 >= 20)", () => {
      const result = IndicatorCalculator.calculateEMA(makeCandles(20), 20)
      expect(result).not.toBeNull()
      expect(typeof result).toBe("number")
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateEMA([], 20)).toBeNull()
    })
  })

  describe("calculateMACD", () => {
    it("returns null when candles.length < slowPeriod + signalPeriod - 1 (10 < 34)", () => {
      expect(IndicatorCalculator.calculateMACD(makeCandles(10), 12, 26, 9)).toBeNull()
    })

    it("returns MACDResult when candles.length >= slowPeriod + signalPeriod - 1 (34 >= 34)", () => {
      const result = IndicatorCalculator.calculateMACD(makeCandles(34), 12, 26, 9)
      expect(result).not.toBeNull()
      expect(result).toHaveProperty("macd")
      expect(result).toHaveProperty("signal")
      expect(result).toHaveProperty("histogram")
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateMACD([], 12, 26, 9)).toBeNull()
    })
  })

  describe("calculateBollinger", () => {
    it("returns null when candles.length < period (5 < 20)", () => {
      expect(IndicatorCalculator.calculateBollinger(makeCandles(5), 20, 2)).toBeNull()
    })

    it("returns BollingerResult when candles.length >= period (20 >= 20)", () => {
      const result = IndicatorCalculator.calculateBollinger(makeCandles(20), 20, 2)
      expect(result).not.toBeNull()
      expect(result).toHaveProperty("upper")
      expect(result).toHaveProperty("middle")
      expect(result).toHaveProperty("lower")
    })

    it("returns null for empty candles array", () => {
      expect(IndicatorCalculator.calculateBollinger([], 20, 2)).toBeNull()
    })
  })

  describe("getAverageVolume", () => {
    it("returns 0 (not null) when candles is empty — volume 0 is valid", () => {
      expect(IndicatorCalculator.getAverageVolume([], 20)).toBe(0)
    })

    it("returns a number for non-empty candles", () => {
      const result = IndicatorCalculator.getAverageVolume(makeCandles(10), 20)
      expect(typeof result).toBe("number")
      expect(result).toBeGreaterThan(0)
    })
  })

  describe("getPriceChange", () => {
    it("returns 0 (not null) when candles is empty — 0% change is valid", () => {
      expect(IndicatorCalculator.getPriceChange([], 1)).toBe(0)
    })

    it("returns a number for sufficient candles", () => {
      const result = IndicatorCalculator.getPriceChange(makeCandles(10), 1)
      expect(typeof result).toBe("number")
    })
  })

  describe("detectLevels", () => {
    it("returns empty arrays (not null) for empty candles", () => {
      const result = IndicatorCalculator.detectLevels([])
      expect(result.supports).toEqual([])
      expect(result.resistances).toEqual([])
    })

    it("returns DetectedLevels object for sufficient candles", () => {
      const result = IndicatorCalculator.detectLevels(makeCandles(60))
      expect(Array.isArray(result.supports)).toBe(true)
      expect(Array.isArray(result.resistances)).toBe(true)
    })
  })
})
