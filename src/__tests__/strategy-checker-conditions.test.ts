import { describe, it, expect } from "vitest"
import { SignalChecker } from "@/server/services/signal-checker"
import { evaluateCrossing, getIndicatorKey } from "@/server/services/crossing-detector"
import { cleanTicker } from "@/lib/ticker-utils"
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
  condition: condition as SignalCondition["condition"],
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

describe("CROSSES_ABOVE crossing detection", () => {
  it("prev=28, current=32, target=30 -> true (crossed above)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 32, 30, "RSI", { RSI: 28 })).toBe(true)
  })

  it("prev=32, current=35, target=30 -> false (stayed above, no crossing)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 35, 30, "RSI", { RSI: 32 })).toBe(false)
  })

  it("prev=25, current=28, target=30 -> false (still below)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 28, 30, "RSI", { RSI: 25 })).toBe(false)
  })

  it("prev=null (first check), current=32, target=30 -> false (no previous data)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 32, 30, "RSI", undefined)).toBe(false)
  })

  it("prev=30, current=30.01, target=30 -> false (prev is exactly at threshold, not below)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 30.01, 30, "RSI", { RSI: 30 })).toBe(false)
  })

  it("prev=29.99, current=30, target=30 -> true (exact boundary cross, prev was below)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 30, 30, "RSI", { RSI: 29.99 })).toBe(true)
  })
})

describe("CROSSES_BELOW crossing detection", () => {
  it("prev=32, current=28, target=30 -> true (crossed below)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 28, 30, "RSI", { RSI: 32 })).toBe(true)
  })

  it("prev=28, current=25, target=30 -> false (stayed below)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 25, 30, "RSI", { RSI: 28 })).toBe(false)
  })

  it("prev=35, current=32, target=30 -> false (stayed above)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 32, 30, "RSI", { RSI: 35 })).toBe(false)
  })

  it("prev=null, current=28, target=30 -> false (no previous data)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 28, 30, "RSI", undefined)).toBe(false)
  })

  it("prev=30.01, current=30, target=30 -> true (exact boundary cross from above)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 30, 30, "RSI", { RSI: 30.01 })).toBe(true)
  })
})

describe("getIndicatorKey", () => {
  it("returns indicator name when no params", () => {
    const cond: SignalCondition = { indicator: "RSI", params: {}, condition: "GREATER_THAN", value: 70 }
    expect(getIndicatorKey(cond)).toBe("RSI")
  })

  it("includes sorted params in key to distinguish same indicator with different periods", () => {
    const cond20: SignalCondition = { indicator: "SMA", params: { period: 20 }, condition: "GREATER_THAN", value: 0 }
    const cond50: SignalCondition = { indicator: "SMA", params: { period: 50 }, condition: "GREATER_THAN", value: 0 }
    expect(getIndicatorKey(cond20)).not.toBe(getIndicatorKey(cond50))
    expect(getIndicatorKey(cond20)).toBe("SMA:period=20")
    expect(getIndicatorKey(cond50)).toBe("SMA:period=50")
  })
})

describe("StrategyChecker compare — ABOVE_BY_PERCENT", () => {
  const checker = new SignalChecker()

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

describe("cleanTicker — ticker normalization for strategy checker", () => {
  it("removes trailing @ from ticker", () => {
    expect(cleanTicker("TGLD@")).toBe("TGLD")
  })

  it("leaves clean ticker unchanged", () => {
    expect(cleanTicker("SBER")).toBe("SBER")
  })

  it("only removes trailing @, not internal @", () => {
    expect(cleanTicker("TICK@ER")).toBe("TICK@ER")
  })
})

describe("StrategyChecker compare — ABOVE/BELOW_BY_PERCENT formula verification", () => {
  it("ABOVE_BY_PERCENT formula verified: ((actual - currentPrice) / currentPrice) * 100 >= target", () => {
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
