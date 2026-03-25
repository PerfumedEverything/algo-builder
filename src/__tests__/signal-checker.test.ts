import { describe, it, expect, vi } from "vitest"
import { evaluateCrossing, getIndicatorKey } from "@/server/services/crossing-detector"
import { SignalChecker } from "@/server/services/signal-checker"
import { cleanTicker } from "@/lib/ticker-utils"
import type { SignalCondition } from "@/core/types"

type EvalContext = {
  price: number
  candles: { open: number; high: number; low: number; close: number; volume: number; time: Date }[]
}

const makeCtx = (price: number): EvalContext => ({ price, candles: [] })

const makeCondition = (condition: string, value: number, indicator = "PRICE"): SignalCondition => ({
  indicator: indicator as SignalCondition["indicator"],
  params: {},
  condition: condition as SignalCondition["condition"],
  value,
})

describe("Signal CROSSES_ABOVE crossing detection", () => {
  it("prev=28, current=32, target=30 -> true (crossed above)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 32, 30, "RSI", { RSI: 28 })).toBe(true)
  })

  it("prev=32, current=35, target=30 -> false (stayed above, no crossing)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 35, 30, "RSI", { RSI: 32 })).toBe(false)
  })

  it("prev=null/undefined, current=32, target=30 -> false (no history)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 32, 30, "RSI", undefined)).toBe(false)
  })

  it("prev=25, current=28, target=30 -> false (still below)", () => {
    expect(evaluateCrossing("CROSSES_ABOVE", 28, 30, "RSI", { RSI: 25 })).toBe(false)
  })
})

describe("Signal CROSSES_BELOW crossing detection", () => {
  it("prev=32, current=28, target=30 -> true (crossed below)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 28, 30, "RSI", { RSI: 32 })).toBe(true)
  })

  it("prev=28, current=25, target=30 -> false (stayed below)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 25, 30, "RSI", { RSI: 28 })).toBe(false)
  })

  it("prev=null/undefined, current=28, target=30 -> false (no history)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 28, 30, "RSI", undefined)).toBe(false)
  })

  it("prev=35, current=32, target=30 -> false (stayed above)", () => {
    expect(evaluateCrossing("CROSSES_BELOW", 32, 30, "RSI", { RSI: 35 })).toBe(false)
  })
})

describe("Signal null indicator handling", () => {
  const checker = new SignalChecker()

  it("RSI with no candles returns null from evaluateCondition", () => {
    const cond = makeCondition("GREATER_THAN", 70, "RSI")
    expect(checker.evaluateCondition(cond, makeCtx(100))).toBeNull()
  })

  it("evaluateCondition with lastValues - CROSSES_ABOVE uses previous value", () => {
    const cond = makeCondition("CROSSES_ABOVE", 100, "PRICE")
    const result = checker.evaluateCondition(cond, makeCtx(110), { PRICE: 90 })
    expect(result).toBe(true)
  })

  it("evaluateCondition with lastValues - CROSSES_ABOVE no prior history returns false", () => {
    const cond = makeCondition("CROSSES_ABOVE", 100, "PRICE")
    expect(checker.evaluateCondition(cond, makeCtx(110), {})).toBe(false)
  })

  it("PRICE indicator returns value, not null", () => {
    const cond = makeCondition("GREATER_THAN", 100, "PRICE")
    expect(checker.evaluateCondition(cond, makeCtx(150))).toBe(true)
  })
})

describe("Signal getIndicatorKey", () => {
  it("returns indicator name when no params", () => {
    const cond: SignalCondition = { indicator: "RSI", params: {}, condition: "GREATER_THAN", value: 70 }
    expect(getIndicatorKey(cond)).toBe("RSI")
  })

  it("distinguishes same indicator with different periods", () => {
    const cond20: SignalCondition = { indicator: "SMA", params: { period: 20 }, condition: "GREATER_THAN", value: 0 }
    const cond50: SignalCondition = { indicator: "SMA", params: { period: 50 }, condition: "GREATER_THAN", value: 0 }
    expect(getIndicatorKey(cond20)).toBe("SMA:period=20")
    expect(getIndicatorKey(cond50)).toBe("SMA:period=50")
    expect(getIndicatorKey(cond20)).not.toBe(getIndicatorKey(cond50))
  })
})

describe("Signal CheckResult error flag", () => {
  it("evaluateCondition returns null for unknown indicator (not 0)", () => {
    const cond: SignalCondition = {
      indicator: "UNKNOWN" as SignalCondition["indicator"],
      params: {},
      condition: "GREATER_THAN",
      value: 0,
    }
    expect(checker.evaluateCondition(cond, makeCtx(100))).toBeNull()
  })
})

const checker = new SignalChecker()

describe("cleanTicker — signal ticker normalization", () => {
  it("removes trailing @ suffix", () => {
    expect(cleanTicker("TGLD@")).toBe("TGLD")
  })

  it("leaves clean ticker unchanged", () => {
    expect(cleanTicker("SBER")).toBe("SBER")
  })
})

describe("SignalChecker.evaluateCondition — basic conditions", () => {
  it("GREATER_THAN: true when price > target", () => {
    expect(checker.evaluateCondition(makeCondition("GREATER_THAN", 100), makeCtx(150))).toBe(true)
    expect(checker.evaluateCondition(makeCondition("GREATER_THAN", 100), makeCtx(50))).toBe(false)
  })

  it("LESS_THAN: true when price < target", () => {
    expect(checker.evaluateCondition(makeCondition("LESS_THAN", 200), makeCtx(150))).toBe(true)
    expect(checker.evaluateCondition(makeCondition("LESS_THAN", 200), makeCtx(250))).toBe(false)
  })

  it("EQUALS: true within 0.01 tolerance", () => {
    expect(checker.evaluateCondition(makeCondition("EQUALS", 100), makeCtx(100))).toBe(true)
    expect(checker.evaluateCondition(makeCondition("EQUALS", 100), makeCtx(100.005))).toBe(true)
    expect(checker.evaluateCondition(makeCondition("EQUALS", 100), makeCtx(101))).toBe(false)
  })

  it("handles missing value (defaults to 0)", () => {
    const cond: SignalCondition = { indicator: "PRICE", params: {}, condition: "GREATER_THAN" }
    expect(checker.evaluateCondition(cond, makeCtx(10))).toBe(true)
    expect(checker.evaluateCondition(cond, makeCtx(-10))).toBe(false)
  })
})
