import { describe, it, expect } from "vitest"
import {
  evaluateBacktestCondition,
  evaluateBacktestConditions,
} from "@/server/services/evaluate-conditions"
import type { StrategyCondition } from "@/core/types"

const makeRsiCondition = (condition: string, value: number): StrategyCondition => ({
  indicator: "RSI",
  params: { period: 14 },
  condition: condition as StrategyCondition["condition"],
  value,
})

const makeSmaCondition = (condition: string, value: number): StrategyCondition => ({
  indicator: "SMA",
  params: { period: 20 },
  condition: condition as StrategyCondition["condition"],
  value,
})

describe("evaluateBacktestCondition", () => {
  it("RSI_14=28, condition RSI < 30 => true", () => {
    const cond = makeRsiCondition("LESS_THAN", 30)
    const indicators = { RSI_14: 28 }
    expect(evaluateBacktestCondition(cond, indicators, 100)).toBe(true)
  })

  it("RSI_14=35, condition RSI < 30 => false", () => {
    const cond = makeRsiCondition("LESS_THAN", 30)
    const indicators = { RSI_14: 35 }
    expect(evaluateBacktestCondition(cond, indicators, 100)).toBe(false)
  })

  it("RSI_14=75, condition RSI > 70 => true", () => {
    const cond = makeRsiCondition("GREATER_THAN", 70)
    const indicators = { RSI_14: 75 }
    expect(evaluateBacktestCondition(cond, indicators, 100)).toBe(true)
  })

  it("RSI_14=65, condition RSI > 70 => false", () => {
    const cond = makeRsiCondition("GREATER_THAN", 70)
    const indicators = { RSI_14: 65 }
    expect(evaluateBacktestCondition(cond, indicators, 100)).toBe(false)
  })

  it("returns null when indicator value is null (insufficient candles)", () => {
    const cond = makeRsiCondition("LESS_THAN", 30)
    const indicators = { RSI_14: null }
    expect(evaluateBacktestCondition(cond, indicators, 100)).toBeNull()
  })

  it("returns null when indicator key not present in map", () => {
    const cond = makeRsiCondition("LESS_THAN", 30)
    const indicators = {}
    expect(evaluateBacktestCondition(cond, indicators, 100)).toBeNull()
  })

  it("PRICE condition uses currentPrice directly", () => {
    const cond: StrategyCondition = {
      indicator: "PRICE",
      params: {},
      condition: "GREATER_THAN",
      value: 100,
    }
    expect(evaluateBacktestCondition(cond, {}, 105)).toBe(true)
    expect(evaluateBacktestCondition(cond, {}, 95)).toBe(false)
  })

  it("BETWEEN condition: actual in range => true", () => {
    const cond: StrategyCondition = {
      indicator: "RSI",
      params: { period: 14 },
      condition: "BETWEEN",
      value: 30,
      valueTo: 70,
    }
    expect(evaluateBacktestCondition(cond, { RSI_14: 50 }, 100)).toBe(true)
    expect(evaluateBacktestCondition(cond, { RSI_14: 25 }, 100)).toBe(false)
  })
})

describe("evaluateBacktestConditions", () => {
  it("AND logic: [RSI<30, SMA>100] with RSI=28, SMA=105 => true (both met)", () => {
    const conditions = [makeRsiCondition("LESS_THAN", 30), makeSmaCondition("GREATER_THAN", 100)]
    const indicators = { RSI_14: 28, SMA_20: 105 }
    expect(evaluateBacktestConditions(conditions, "AND", indicators, 106)).toBe(true)
  })

  it("AND logic: [RSI<30, SMA>100] with RSI=28, SMA=95 => false (SMA not met)", () => {
    const conditions = [makeRsiCondition("LESS_THAN", 30), makeSmaCondition("GREATER_THAN", 100)]
    const indicators = { RSI_14: 28, SMA_20: 95 }
    expect(evaluateBacktestConditions(conditions, "AND", indicators, 94)).toBe(false)
  })

  it("OR logic: [RSI<30, SMA>100] with RSI=35, SMA=105 => true (SMA met)", () => {
    const conditions = [makeRsiCondition("LESS_THAN", 30), makeSmaCondition("GREATER_THAN", 100)]
    const indicators = { RSI_14: 35, SMA_20: 105 }
    expect(evaluateBacktestConditions(conditions, "OR", indicators, 106)).toBe(true)
  })

  it("OR logic: all conditions null => false", () => {
    const conditions = [makeRsiCondition("LESS_THAN", 30)]
    const indicators = { RSI_14: null }
    expect(evaluateBacktestConditions(conditions, "OR", indicators, 100)).toBe(false)
  })

  it("AND logic: empty conditions => false", () => {
    expect(evaluateBacktestConditions([], "AND", {}, 100)).toBe(false)
  })

  it("OR logic: empty conditions => false", () => {
    expect(evaluateBacktestConditions([], "OR", {}, 100)).toBe(false)
  })
})
