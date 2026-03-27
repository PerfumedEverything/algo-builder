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

describe("500+ candle warmup accuracy", () => {
  const candles600 = makeCandles(600)

  it("calculateRSI returns a number between 0 and 100 with 600 candles", () => {
    const result = IndicatorCalculator.calculateRSI(candles600, 14)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(0)
    expect(result!).toBeLessThanOrEqual(100)
  })

  it("calculateSMA returns close to mean of last 20 closes with 600 candles", () => {
    const result = IndicatorCalculator.calculateSMA(candles600, 20)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
    const last20Mean = candles600.slice(-20).reduce((s, c) => s + c.close, 0) / 20
    expect(Math.abs(result! - last20Mean)).toBeLessThan(0.001)
  })

  it("calculateEMA returns a non-null number with 600 candles", () => {
    const result = IndicatorCalculator.calculateEMA(candles600, 20)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("calculateMACD returns object with macd, signal, histogram as numbers with 600 candles", () => {
    const result = IndicatorCalculator.calculateMACD(candles600)
    expect(result).not.toBeNull()
    expect(typeof result!.macd).toBe("number")
    expect(typeof result!.signal).toBe("number")
    expect(typeof result!.histogram).toBe("number")
  })

  it("calculateBollinger returns upper > middle > lower with 600 candles", () => {
    const result = IndicatorCalculator.calculateBollinger(candles600)
    expect(result).not.toBeNull()
    expect(result!.upper).toBeGreaterThan(result!.middle)
    expect(result!.middle).toBeGreaterThan(result!.lower)
  })

  it("calculateATR returns a positive number with 600 candles", () => {
    const result = IndicatorCalculator.calculateATR(candles600, 14)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })

  it("calculateStochastic returns a number between 0 and 100 with 600 candles", () => {
    const result = IndicatorCalculator.calculateStochastic(candles600, 14, 3)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(0)
    expect(result!).toBeLessThanOrEqual(100)
  })

  it("calculateVWAP returns a non-null number with 600 candles", () => {
    const result = IndicatorCalculator.calculateVWAP(candles600)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("calculateWilliamsR returns a number between -100 and 0 with 600 candles", () => {
    const result = IndicatorCalculator.calculateWilliamsR(candles600, 14)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(-100)
    expect(result!).toBeLessThanOrEqual(0)
  })
})

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
    it("returns null when candles.length < period + 1 (5 < 21)", () => {
      expect(IndicatorCalculator.calculateBollinger(makeCandles(5), 20, 2)).toBeNull()
    })

    it("returns BollingerResult when candles.length >= period + 1 (21 >= 21)", () => {
      const result = IndicatorCalculator.calculateBollinger(makeCandles(21), 20, 2)
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
