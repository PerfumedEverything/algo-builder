import { describe, it, expect } from "vitest"
import { compareCondition, getIndicatorValue } from "@/server/services/crossing-detector"
import type { EvalContext } from "@/server/services/crossing-detector"
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

describe("compareCondition — BETWEEN", () => {
  it("returns true when actual is within range (inclusive bounds)", () => {
    expect(compareCondition(50, "BETWEEN", 30, undefined, 70)).toBe(true)
  })

  it("returns false when actual is above the upper bound", () => {
    expect(compareCondition(80, "BETWEEN", 30, undefined, 70)).toBe(false)
  })

  it("returns false when actual is below the lower bound", () => {
    expect(compareCondition(10, "BETWEEN", 30, undefined, 70)).toBe(false)
  })

  it("returns true when actual equals the lower bound (inclusive)", () => {
    expect(compareCondition(30, "BETWEEN", 30, undefined, 70)).toBe(true)
  })

  it("returns true when actual equals the upper bound (inclusive)", () => {
    expect(compareCondition(70, "BETWEEN", 30, undefined, 70)).toBe(true)
  })

  it("returns false when target2 is undefined", () => {
    expect(compareCondition(50, "BETWEEN", 30, undefined, undefined)).toBe(false)
  })

  it("returns false when target > target2 and actual is between them (impossible range)", () => {
    expect(compareCondition(50, "BETWEEN", 70, undefined, 30)).toBe(false)
  })
})

describe("getIndicatorValue — new indicators", () => {
  const candles20 = makeCandles(20)
  const ctx: EvalContext = { price: 100, candles: candles20 }

  it("returns a number for ATR condition with 20 candles", () => {
    const result = getIndicatorValue({ indicator: "ATR", params: { period: 14 }, condition: "GREATER_THAN" }, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("returns a number for STOCHASTIC condition with 20 candles", () => {
    const result = getIndicatorValue({ indicator: "STOCHASTIC", params: { period: 14, signalPeriod: 3 }, condition: "GREATER_THAN" }, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("returns a number for VWAP condition with 20 candles", () => {
    const result = getIndicatorValue({ indicator: "VWAP", params: {}, condition: "GREATER_THAN" }, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("returns a number for WILLIAMS_R condition with 20 candles", () => {
    const result = getIndicatorValue({ indicator: "WILLIAMS_R", params: { period: 14 }, condition: "GREATER_THAN" }, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })
})
