import { Indicators } from "@ixjb94/indicators"
import type { SignalCondition, LogicOperator } from "@/core/types"
import { IndicatorCalculator } from "./indicator-calculator"
import {
  calculateRSISeries,
  calculateSMASeries,
  calculateEMASeries,
  calculateStochasticSeries,
  calculateWilliamsRSeries,
} from "./indicator-series"

export type EvalContext = {
  price: number
  candles: { open: number; high: number; low: number; close: number; volume: number; time: Date }[]
}

const ta = new Indicators()

export const getIndicatorKey = (condition: SignalCondition): string => {
  const sortedParams = Object.keys(condition.params)
    .sort()
    .map((k) => `${k}=${condition.params[k as keyof typeof condition.params]}`)
    .join(",")
  return sortedParams ? `${condition.indicator}:${sortedParams}` : condition.indicator
}

export const evaluateCrossing = (
  type: "CROSSES_ABOVE" | "CROSSES_BELOW",
  current: number,
  target: number,
  indicatorKey: string,
  lastValues?: Record<string, number>,
): boolean => {
  const prev = lastValues?.[indicatorKey]
  if (prev === undefined || prev === null) return false
  if (type === "CROSSES_ABOVE") return prev < target && current >= target
  return prev > target && current <= target
}

export const evaluateCrossingBatch = async (
  type: "CROSSES_ABOVE" | "CROSSES_BELOW",
  series: number[],
  target: number,
): Promise<boolean> => {
  if (series.length < 2) return false
  const result = type === "CROSSES_ABOVE"
    ? await ta.crossOverNumber(series, target)
    : await ta.crossUnderNumber(series, target)
  return result[result.length - 1] ?? false
}

const getIndicatorSeries = (condition: SignalCondition, candles: EvalContext["candles"]): number[] => {
  const { indicator, params } = condition
  switch (indicator) {
    case "RSI": return calculateRSISeries(candles, params.period ?? 14)
    case "SMA": return calculateSMASeries(candles, params.period ?? 20)
    case "EMA": return calculateEMASeries(candles, params.period ?? 20)
    case "STOCHASTIC": return calculateStochasticSeries(candles, params.period ?? params.kPeriod ?? 14, params.signalPeriod ?? params.dPeriod ?? 3)
    case "WILLIAMS_R": return calculateWilliamsRSeries(candles, params.period ?? 14)
    default: return []
  }
}

export const getIndicatorValue = (condition: SignalCondition, ctx: EvalContext): number | null => {
  const { indicator, params } = condition
  const { price, candles } = ctx

  switch (indicator) {
    case "PRICE":
      return price
    case "RSI":
      return IndicatorCalculator.calculateRSI(candles, params.period ?? 14)
    case "SMA":
      return IndicatorCalculator.calculateSMA(candles, params.period ?? 20)
    case "EMA":
      return IndicatorCalculator.calculateEMA(candles, params.period ?? 20)
    case "MACD": {
      const fast = params.fast ?? params.fastPeriod ?? 12
      const slow = params.slow ?? params.slowPeriod ?? 26
      const signal = params.signal ?? params.signalPeriod ?? 9
      const macd = IndicatorCalculator.calculateMACD(candles, fast, slow, signal)
      return macd?.macd ?? null
    }
    case "BOLLINGER": {
      const bb = IndicatorCalculator.calculateBollinger(candles, params.period ?? 20, params.stdDev ?? 2)
      return bb?.upper ?? null
    }
    case "VOLUME": {
      const avgVol = IndicatorCalculator.getAverageVolume(candles, params.period ?? 20)
      const currentVol = candles[candles.length - 1]?.volume ?? 0
      return avgVol > 0 ? currentVol / avgVol : 0
    }
    case "PRICE_CHANGE":
      return IndicatorCalculator.getPriceChange(candles, params.period ?? 1)
    case "SUPPORT": {
      const levels = IndicatorCalculator.detectLevels(candles, params.lookback ?? 50)
      return levels.supports.filter((s) => s <= price).sort((a, b) => b - a)[0] ?? null
    }
    case "RESISTANCE": {
      const levels = IndicatorCalculator.detectLevels(candles, params.lookback ?? 50)
      return levels.resistances.filter((r) => r >= price).sort((a, b) => a - b)[0] ?? null
    }
    case "ATR":
      return IndicatorCalculator.calculateATR(candles, params.period ?? 14)
    case "STOCHASTIC": {
      const period = params.period ?? params.kPeriod ?? 14
      const signalPeriod = params.signalPeriod ?? params.dPeriod ?? 3
      return IndicatorCalculator.calculateStochastic(candles, period, signalPeriod)
    }
    case "VWAP":
      return IndicatorCalculator.calculateVWAP(candles)
    case "WILLIAMS_R":
      return IndicatorCalculator.calculateWilliamsR(candles, params.period ?? 14)
    default:
      return null
  }
}

export const compareCondition = (
  actual: number,
  condition: string,
  target: number,
  currentPrice?: number,
  target2?: number,
): boolean => {
  switch (condition) {
    case "GREATER_THAN": return actual > target
    case "LESS_THAN": return actual < target
    case "EQUALS": return Math.abs(actual - target) < 0.01
    case "BETWEEN":
      if (target2 === undefined) return false
      return actual >= target && actual <= target2
    case "ABOVE_BY_PERCENT": return currentPrice != null && currentPrice > 0 && ((actual - currentPrice) / currentPrice) * 100 >= target
    case "BELOW_BY_PERCENT": return currentPrice != null && currentPrice > 0 && ((currentPrice - actual) / currentPrice) * 100 >= target
    case "MULTIPLIED_BY": return actual >= target
    default: return false
  }
}

export const evaluateCondition = async (condition: SignalCondition, ctx: EvalContext, lastValues?: Record<string, number>): Promise<boolean | null> => {
  if (condition.condition === "CROSSES_ABOVE" || condition.condition === "CROSSES_BELOW") {
    const series = getIndicatorSeries(condition, ctx.candles)
    if (series.length < 2) return false
    return evaluateCrossingBatch(condition.condition, series, condition.value ?? 0)
  }
  const actual = getIndicatorValue(condition, ctx)
  if (actual === null) return null
  const target = condition.value ?? 0
  return compareCondition(actual, condition.condition, target, ctx.price, condition.valueTo)
}

export const evaluateConditions = async (conditions: SignalCondition[], logic: LogicOperator, ctx: EvalContext, lastValues?: Record<string, number>): Promise<boolean> => {
  const results = await Promise.all(conditions.map((c) => evaluateCondition(c, ctx, lastValues)))
  const evaluated = results.filter((r): r is boolean => r !== null)
  if (evaluated.length === 0) return false
  return logic === "AND" ? evaluated.every(Boolean) : evaluated.some(Boolean)
}
