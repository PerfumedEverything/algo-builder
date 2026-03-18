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

describe("SignalChecker.evaluateCondition", () => {
  const checker = new SignalChecker()

  it("GREATER_THAN: true when value > target", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "GREATER_THAN",
      value: 100,
    }
    expect(checker.evaluateCondition(condition, makeCtx(150))).toBe(true)
    expect(checker.evaluateCondition(condition, makeCtx(50))).toBe(false)
    expect(checker.evaluateCondition(condition, makeCtx(100))).toBe(false)
  })

  it("LESS_THAN: true when value < target", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "LESS_THAN",
      value: 200,
    }
    expect(checker.evaluateCondition(condition, makeCtx(150))).toBe(true)
    expect(checker.evaluateCondition(condition, makeCtx(250))).toBe(false)
  })

  it("EQUALS: true when value ≈ target (within 0.01)", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "EQUALS",
      value: 100,
    }
    expect(checker.evaluateCondition(condition, makeCtx(100))).toBe(true)
    expect(checker.evaluateCondition(condition, makeCtx(100.005))).toBe(true)
    expect(checker.evaluateCondition(condition, makeCtx(101))).toBe(false)
  })

  it("CROSSES_ABOVE: true when value > target", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "CROSSES_ABOVE",
      value: 100,
    }
    expect(checker.evaluateCondition(condition, makeCtx(110))).toBe(true)
    expect(checker.evaluateCondition(condition, makeCtx(90))).toBe(false)
  })

  it("CROSSES_BELOW: true when value < target", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "CROSSES_BELOW",
      value: 100,
    }
    expect(checker.evaluateCondition(condition, makeCtx(90))).toBe(true)
    expect(checker.evaluateCondition(condition, makeCtx(110))).toBe(false)
  })

  it("BETWEEN: always false (not implemented)", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "BETWEEN",
      value: 100,
    }
    expect(checker.evaluateCondition(condition, makeCtx(100))).toBe(false)
  })

  it("handles missing value (defaults to 0)", () => {
    const condition: SignalCondition = {
      indicator: "PRICE",
      params: {},
      condition: "GREATER_THAN",
    }
    expect(checker.evaluateCondition(condition, makeCtx(10))).toBe(true)
    expect(checker.evaluateCondition(condition, makeCtx(-10))).toBe(false)
  })
})
