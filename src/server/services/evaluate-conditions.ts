import type { StrategyCondition, LogicOperator } from "@/core/types"

type IndicatorValues = Record<string, number | null>

const getIndicatorKey = (indicator: string, params: Record<string, number>): string => {
  if (indicator === "PRICE") return "PRICE"
  const period = params.period
  return period !== undefined ? `${indicator}_${period}` : indicator
}

const compareValue = (
  actual: number,
  condition: string,
  target: number,
  targetTo?: number,
): boolean => {
  switch (condition) {
    case "GREATER_THAN":
      return actual > target
    case "LESS_THAN":
      return actual < target
    case "EQUALS":
      return Math.abs(actual - target) < 0.01
    case "BETWEEN":
      return targetTo !== undefined && actual >= target && actual <= targetTo
    default:
      return false
  }
}

export const evaluateBacktestCondition = (
  cond: StrategyCondition,
  indicators: IndicatorValues,
  currentPrice: number,
): boolean | null => {
  const key = getIndicatorKey(cond.indicator, cond.params)
  const actual = key === "PRICE" ? currentPrice : indicators[key]
  if (actual === null || actual === undefined) return null
  return compareValue(actual, cond.condition, cond.value ?? 0, cond.valueTo)
}

export const evaluateBacktestConditions = (
  conditions: StrategyCondition[],
  logic: LogicOperator,
  indicators: IndicatorValues,
  currentPrice: number,
): boolean => {
  const results = conditions.map((c) => evaluateBacktestCondition(c, indicators, currentPrice))
  const evaluated = results.filter((r): r is boolean => r !== null)
  if (evaluated.length === 0) return false
  return logic === "AND" ? evaluated.every(Boolean) : evaluated.some(Boolean)
}
