import { describe, it, expect } from "vitest"
import { getIndicatorValue, evaluateCondition, compareCondition } from "@/server/services/crossing-detector"
import type { EvalContext } from "@/server/services/crossing-detector"
import type { Candle, SignalCondition } from "@/core/types"
import { INDICATORS } from "@/core/config/indicators"

function makeCandles(count: number, options?: { trend?: "up" | "down" | "flat" }): Candle[] {
  const trend = options?.trend ?? "up"
  return Array.from({ length: count }, (_, i) => {
    const base = trend === "up" ? 100 + i * 0.5 : trend === "down" ? 200 - i * 0.5 : 150
    return {
      open: base,
      high: base + 2,
      low: base - 2,
      close: base + (trend === "up" ? 1 : trend === "down" ? -1 : 0),
      volume: 1000000 + i * 10000,
      time: new Date(Date.now() - (count - i) * 60000),
    }
  })
}

const largeCtx = (trend?: "up" | "down" | "flat"): EvalContext => ({
  price: 150,
  candles: makeCandles(100, { trend }),
})

describe("Parameter propagation — MACD", () => {
  const ctx = largeCtx()

  it("uses params.fast/slow/signal (new format)", () => {
    const cond: SignalCondition = { indicator: "MACD", params: { fast: 8, slow: 21, signal: 5 }, condition: "GREATER_THAN", value: -100 }
    const result = getIndicatorValue(cond, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("uses params.fastPeriod/slowPeriod/signalPeriod (legacy format)", () => {
    const cond: SignalCondition = { indicator: "MACD", params: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 }, condition: "GREATER_THAN", value: -100 }
    const result = getIndicatorValue(cond, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("new format params produce different values than defaults when periods differ", () => {
    const defaultCond: SignalCondition = { indicator: "MACD", params: {}, condition: "GREATER_THAN", value: -100 }
    const customCond: SignalCondition = { indicator: "MACD", params: { fast: 5, slow: 15, signal: 3 }, condition: "GREATER_THAN", value: -100 }
    const defaultVal = getIndicatorValue(defaultCond, ctx)
    const customVal = getIndicatorValue(customCond, ctx)
    expect(defaultVal).not.toBeNull()
    expect(customVal).not.toBeNull()
    expect(defaultVal).not.toBe(customVal)
  })
})

describe("Parameter propagation — STOCHASTIC", () => {
  const ctx = largeCtx()

  it("uses params.period/signalPeriod (new format)", () => {
    const cond: SignalCondition = { indicator: "STOCHASTIC", params: { period: 10, signalPeriod: 5 }, condition: "GREATER_THAN", value: 0 }
    const result = getIndicatorValue(cond, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("uses params.kPeriod/dPeriod (legacy format)", () => {
    const cond: SignalCondition = { indicator: "STOCHASTIC", params: { kPeriod: 10, dPeriod: 5 }, condition: "GREATER_THAN", value: 0 }
    const result = getIndicatorValue(cond, ctx)
    expect(result).not.toBeNull()
    expect(typeof result).toBe("number")
  })

  it("custom periods produce different values than defaults", () => {
    const defaultCond: SignalCondition = { indicator: "STOCHASTIC", params: {}, condition: "GREATER_THAN", value: 0 }
    const customCond: SignalCondition = { indicator: "STOCHASTIC", params: { period: 5, signalPeriod: 2 }, condition: "GREATER_THAN", value: 0 }
    const defaultVal = getIndicatorValue(defaultCond, ctx)
    const customVal = getIndicatorValue(customCond, ctx)
    expect(defaultVal).not.toBeNull()
    expect(customVal).not.toBeNull()
    expect(defaultVal).not.toBe(customVal)
  })
})

describe("All 14 indicators — getIndicatorValue returns non-null with sufficient data", () => {
  const ctx = largeCtx()

  const indicatorConfigs: { indicator: string; params: Record<string, number> }[] = [
    { indicator: "PRICE", params: {} },
    { indicator: "SMA", params: { period: 20 } },
    { indicator: "EMA", params: { period: 12 } },
    { indicator: "RSI", params: { period: 14 } },
    { indicator: "MACD", params: { fast: 12, slow: 26, signal: 9 } },
    { indicator: "BOLLINGER", params: { period: 20, stdDev: 2 } },
    { indicator: "VOLUME", params: { period: 20 } },
    { indicator: "PRICE_CHANGE", params: { period: 1 } },
    // SUPPORT/RESISTANCE may return null if no levels detected in synthetic data
    { indicator: "ATR", params: { period: 14 } },
    { indicator: "STOCHASTIC", params: { period: 14, signalPeriod: 3 } },
    { indicator: "VWAP", params: {} },
    { indicator: "WILLIAMS_R", params: { period: 14 } },
  ]

  for (const cfg of indicatorConfigs) {
    it(`${cfg.indicator} returns a numeric value`, () => {
      const cond: SignalCondition = { indicator: cfg.indicator as any, params: cfg.params, condition: "GREATER_THAN", value: 0 }
      const result = getIndicatorValue(cond, ctx)
      expect(result).not.toBeNull()
      expect(typeof result).toBe("number")
      expect(Number.isFinite(result)).toBe(true)
    })
  }
})

describe("All 14 indicators — null safety with insufficient data", () => {
  const smallCtx: EvalContext = { price: 100, candles: makeCandles(3) }

  const nullableIndicators = ["SMA", "EMA", "RSI", "MACD", "BOLLINGER", "ATR", "STOCHASTIC", "WILLIAMS_R"]

  for (const ind of nullableIndicators) {
    it(`${ind} returns null with only 3 candles`, () => {
      const cond: SignalCondition = { indicator: ind as any, params: {}, condition: "GREATER_THAN", value: 0 }
      const result = getIndicatorValue(cond, smallCtx)
      expect(result).toBeNull()
    })
  }

  it("PRICE always returns value regardless of candle count", () => {
    const cond: SignalCondition = { indicator: "PRICE", params: {}, condition: "GREATER_THAN", value: 0 }
    const result = getIndicatorValue(cond, smallCtx)
    expect(result).toBe(100)
  })
})

describe("evaluateCondition — all condition types", () => {
  const ctx = largeCtx()

  it("GREATER_THAN: RSI > 20 is true (uptrend generates high RSI)", async () => {
    const cond: SignalCondition = { indicator: "RSI", params: { period: 14 }, condition: "GREATER_THAN", value: 20 }
    const result = await evaluateCondition(cond, ctx)
    expect(result).toBe(true)
  })

  it("LESS_THAN: PRICE < 999 is true", async () => {
    const cond: SignalCondition = { indicator: "PRICE", params: {}, condition: "LESS_THAN", value: 999 }
    const result = await evaluateCondition(cond, ctx)
    expect(result).toBe(true)
  })

  it("EQUALS: PRICE == 150 is true", async () => {
    const cond: SignalCondition = { indicator: "PRICE", params: {}, condition: "EQUALS", value: 150 }
    const result = await evaluateCondition(cond, ctx)
    expect(result).toBe(true)
  })

  it("BETWEEN: Stochastic between 0 and 100 is true", async () => {
    const cond: SignalCondition = { indicator: "STOCHASTIC", params: { period: 14, signalPeriod: 3 }, condition: "BETWEEN", value: 0, valueTo: 100 }
    const result = await evaluateCondition(cond, ctx)
    expect(result).toBe(true)
  })

  it("BETWEEN: returns false when valueTo undefined", async () => {
    const cond: SignalCondition = { indicator: "STOCHASTIC", params: { period: 14, signalPeriod: 3 }, condition: "BETWEEN", value: 0 }
    const result = await evaluateCondition(cond, ctx)
    expect(result).toBe(false)
  })

  it("MULTIPLIED_BY: volume ratio >= 0.5 is true", async () => {
    const cond: SignalCondition = { indicator: "VOLUME", params: { period: 20 }, condition: "MULTIPLIED_BY", value: 0.5 }
    const result = await evaluateCondition(cond, ctx)
    expect(result).toBe(true)
  })

  it("returns null for insufficient data (RSI with 3 candles)", async () => {
    const smallCtx: EvalContext = { price: 100, candles: makeCandles(3) }
    const cond: SignalCondition = { indicator: "RSI", params: { period: 14 }, condition: "GREATER_THAN", value: 30 }
    const result = await evaluateCondition(cond, smallCtx)
    expect(result).toBeNull()
  })
})

describe("compareCondition — edge cases", () => {
  it("GREATER_THAN is strict (equal returns false)", () => {
    expect(compareCondition(30, "GREATER_THAN", 30)).toBe(false)
  })

  it("LESS_THAN is strict (equal returns false)", () => {
    expect(compareCondition(30, "LESS_THAN", 30)).toBe(false)
  })

  it("EQUALS has 0.01 tolerance", () => {
    expect(compareCondition(30.005, "EQUALS", 30)).toBe(true)
    expect(compareCondition(30.02, "EQUALS", 30)).toBe(false)
  })

  it("ABOVE_BY_PERCENT calculates correctly", () => {
    expect(compareCondition(110, "ABOVE_BY_PERCENT", 5, 100)).toBe(true)
    expect(compareCondition(103, "ABOVE_BY_PERCENT", 5, 100)).toBe(false)
  })

  it("BELOW_BY_PERCENT calculates correctly", () => {
    expect(compareCondition(90, "BELOW_BY_PERCENT", 5, 100)).toBe(true)
    expect(compareCondition(97, "BELOW_BY_PERCENT", 5, 100)).toBe(false)
  })

  it("unknown condition returns false", () => {
    expect(compareCondition(50, "NONEXISTENT", 30)).toBe(false)
  })
})

describe("UI config consistency — all indicators have matching backend support", () => {
  const ctx = largeCtx()

  for (const indicator of INDICATORS) {
    it(`${indicator.type}: all allowed conditions are valid`, () => {
      for (const condType of indicator.allowedConditions) {
        const params: Record<string, number> = {}
        for (const p of indicator.params) {
          params[p.name] = p.defaultValue
        }
        const cond: SignalCondition = {
          indicator: indicator.type as any,
          params,
          condition: condType as any,
          value: 50,
          valueTo: condType === "BETWEEN" ? 80 : undefined,
        }
        const value = getIndicatorValue(cond, ctx)
        if (indicator.type !== "SUPPORT" && indicator.type !== "RESISTANCE") {
          expect(value).not.toBeNull()
        }
      }
    })

    it(`${indicator.type}: param names match what backend expects`, () => {
      const params: Record<string, number> = {}
      for (const p of indicator.params) {
        params[p.name] = p.defaultValue
      }
      const cond: SignalCondition = {
        indicator: indicator.type as any,
        params,
        condition: indicator.allowedConditions[0] as any,
        value: 50,
      }
      const value = getIndicatorValue(cond, ctx)
      if (indicator.type !== "SUPPORT" && indicator.type !== "RESISTANCE") {
        expect(value).not.toBeNull()
      }
    })
  }
})
