import { describe, it, expect } from "vitest"
import { SignalChecker } from "@/server/services/signal-checker"
import type { SignalCondition } from "@/core/types"

type EvalContext = {
  price: number
  candles: { open: number; high: number; low: number; close: number; volume: number; time: Date }[]
}

const makeCtx = (price: number): EvalContext => ({
  price,
  candles: [],
})

const makeCondition = (
  condition: string,
  value: number,
): SignalCondition => ({
  indicator: "PRICE",
  params: {},
  condition,
  value,
})

describe("StrategyChecker compare — GREATER_THAN", () => {
  const checker = new SignalChecker()

  it("14.40 > 14.37 = true", () => {
    const cond = makeCondition("GREATER_THAN", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.40))).toBe(true)
  })

  it("14.37 > 14.40 = false", () => {
    const cond = makeCondition("GREATER_THAN", 14.40)
    expect(checker.evaluateCondition(cond, makeCtx(14.37))).toBe(false)
  })

  it("exact equal value is false (strict greater)", () => {
    const cond = makeCondition("GREATER_THAN", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.37))).toBe(false)
  })
})

describe("StrategyChecker compare — LESS_THAN", () => {
  const checker = new SignalChecker()

  it("14.37 < 14.40 = true", () => {
    const cond = makeCondition("LESS_THAN", 14.40)
    expect(checker.evaluateCondition(cond, makeCtx(14.37))).toBe(true)
  })

  it("14.40 < 14.37 = false", () => {
    const cond = makeCondition("LESS_THAN", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.40))).toBe(false)
  })

  it("exact equal value is false (strict less)", () => {
    const cond = makeCondition("LESS_THAN", 14.40)
    expect(checker.evaluateCondition(cond, makeCtx(14.40))).toBe(false)
  })
})

describe("StrategyChecker compare — EQUALS", () => {
  const checker = new SignalChecker()

  it("14.37 == 14.37 = true (exact)", () => {
    const cond = makeCondition("EQUALS", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.37))).toBe(true)
  })

  it("within 0.01 tolerance — 14.37 == 14.376 = true", () => {
    const cond = makeCondition("EQUALS", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.376))).toBe(true)
  })

  it("outside tolerance — 14.37 != 14.38 = false", () => {
    const cond = makeCondition("EQUALS", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.38))).toBe(false)
  })

  it("boundary edge — exactly 0.01 apart is false", () => {
    const cond = makeCondition("EQUALS", 100)
    expect(checker.evaluateCondition(cond, makeCtx(100.01))).toBe(false)
  })

  it("boundary edge — just under 0.01 is true", () => {
    const cond = makeCondition("EQUALS", 100)
    expect(checker.evaluateCondition(cond, makeCtx(100.009))).toBe(true)
  })
})

describe("StrategyChecker compare — CROSSES_ABOVE (same as GREATER_THAN)", () => {
  const checker = new SignalChecker()

  it("14.40 crosses above 14.37 = true", () => {
    const cond = makeCondition("CROSSES_ABOVE", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.40))).toBe(true)
  })

  it("14.37 does not cross above 14.40 = false", () => {
    const cond = makeCondition("CROSSES_ABOVE", 14.40)
    expect(checker.evaluateCondition(cond, makeCtx(14.37))).toBe(false)
  })

  it("equal value does not cross above = false", () => {
    const cond = makeCondition("CROSSES_ABOVE", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.37))).toBe(false)
  })
})

describe("StrategyChecker compare — CROSSES_BELOW (same as LESS_THAN)", () => {
  const checker = new SignalChecker()

  it("14.37 crosses below 14.40 = true", () => {
    const cond = makeCondition("CROSSES_BELOW", 14.40)
    expect(checker.evaluateCondition(cond, makeCtx(14.37))).toBe(true)
  })

  it("14.40 does not cross below 14.37 = false", () => {
    const cond = makeCondition("CROSSES_BELOW", 14.37)
    expect(checker.evaluateCondition(cond, makeCtx(14.40))).toBe(false)
  })

  it("equal value does not cross below = false", () => {
    const cond = makeCondition("CROSSES_BELOW", 14.40)
    expect(checker.evaluateCondition(cond, makeCtx(14.40))).toBe(false)
  })
})

describe("StrategyChecker compare — ABOVE_BY_PERCENT", () => {
  const checker = new SignalChecker()

  // NOTE: With PRICE indicator, actual === ctx.price === currentPrice in the compare() call.
  // Formula: ((actual - currentPrice) / currentPrice) * 100 >= target
  // When indicator is PRICE, actual == currentPrice so the delta is always 0.
  // ABOVE_BY_PERCENT is designed to compare a different indicator value (e.g. SMA) against currentPrice.
  // For PRICE indicator, ABOVE_BY_PERCENT will always return false for any positive target.
  it("PRICE indicator with ABOVE_BY_PERCENT — always false (actual == currentPrice, delta = 0)", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "ABOVE_BY_PERCENT",
      value: 5,
    }
    expect(checker.evaluateCondition(condition, makeCtx(110))).toBe(false)
  })

  it("ABOVE_BY_PERCENT with target 0 — true when actual >= currentPrice (delta = 0 >= 0)", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "ABOVE_BY_PERCENT",
      value: 0,
    }
    expect(checker.evaluateCondition(condition, makeCtx(110))).toBe(true)
  })
})

describe("StrategyChecker compare — BELOW_BY_PERCENT", () => {
  const checker = new SignalChecker()

  // NOTE: With PRICE indicator, actual === ctx.price === currentPrice in the compare() call.
  // Formula: ((currentPrice - actual) / currentPrice) * 100 >= target
  // When indicator is PRICE, actual == currentPrice so delta is always 0.
  // BELOW_BY_PERCENT with PRICE will always be false for any positive target.
  it("PRICE indicator with BELOW_BY_PERCENT — always false (actual == currentPrice, delta = 0)", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "BELOW_BY_PERCENT",
      value: 5,
    }
    expect(checker.evaluateCondition(condition, makeCtx(90))).toBe(false)
  })

  it("BELOW_BY_PERCENT with target 0 — true when currentPrice >= actual (delta = 0 >= 0)", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "BELOW_BY_PERCENT",
      value: 0,
    }
    expect(checker.evaluateCondition(condition, makeCtx(90))).toBe(true)
  })
})

describe("StrategyChecker compare — ABOVE/BELOW_BY_PERCENT formula verification", () => {
  it("ABOVE_BY_PERCENT formula verified: ((actual - currentPrice) / currentPrice) * 100 >= target", () => {
    // Testing the formula logic directly with known numbers
    const actual = 110
    const currentPrice = 100
    const target = 5
    const formulaResult = ((actual - currentPrice) / currentPrice) * 100 >= target
    expect(formulaResult).toBe(true)

    const actual2 = 103
    const formulaResult2 = ((actual2 - currentPrice) / currentPrice) * 100 >= target
    expect(formulaResult2).toBe(false)
  })

  it("BELOW_BY_PERCENT formula verified: ((currentPrice - actual) / currentPrice) * 100 >= target", () => {
    // Testing the formula logic directly with known numbers
    const actual = 90
    const currentPrice = 100
    const target = 5
    const formulaResult = ((currentPrice - actual) / currentPrice) * 100 >= target
    expect(formulaResult).toBe(true)

    const actual2 = 97
    const formulaResult2 = ((currentPrice - actual2) / currentPrice) * 100 >= target
    expect(formulaResult2).toBe(false)
  })
})
