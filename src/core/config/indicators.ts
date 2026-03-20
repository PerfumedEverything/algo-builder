import type { ConditionType, IndicatorType } from "@/core/types"

export type IndicatorParam = {
  name: string
  label: string
  defaultValue: number
  min: number
  max: number
}

export type IndicatorConfig = {
  type: IndicatorType
  label: string
  description: string
  params: IndicatorParam[]
  allowedConditions: ConditionType[]
}

export const INDICATORS: IndicatorConfig[] = [
  {
    type: "SMA",
    label: "Simple Moving Average",
    description: "Average price over N periods",
    params: [
      { name: "period", label: "Period", defaultValue: 20, min: 2, max: 500 },
    ],
    allowedConditions: ["GREATER_THAN", "LESS_THAN", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    type: "EMA",
    label: "Exponential Moving Average",
    description: "Weighted average giving more weight to recent prices",
    params: [
      { name: "period", label: "Period", defaultValue: 12, min: 2, max: 500 },
    ],
    allowedConditions: ["GREATER_THAN", "LESS_THAN", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    type: "RSI",
    label: "Relative Strength Index",
    description: "Momentum oscillator (0-100)",
    params: [
      { name: "period", label: "Period", defaultValue: 14, min: 2, max: 100 },
    ],
    allowedConditions: ["GREATER_THAN", "LESS_THAN", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    type: "MACD",
    label: "MACD",
    description: "Trend-following momentum indicator",
    params: [
      { name: "fastPeriod", label: "Fast Period", defaultValue: 12, min: 2, max: 100 },
      { name: "slowPeriod", label: "Slow Period", defaultValue: 26, min: 2, max: 200 },
      { name: "signalPeriod", label: "Signal Period", defaultValue: 9, min: 2, max: 50 },
    ],
    allowedConditions: ["GREATER_THAN", "LESS_THAN", "CROSSES_ABOVE", "CROSSES_BELOW"],
  },
  {
    type: "BOLLINGER",
    label: "Bollinger Bands",
    description: "Volatility bands around moving average",
    params: [
      { name: "period", label: "Period", defaultValue: 20, min: 2, max: 200 },
      { name: "stdDev", label: "Std Deviation", defaultValue: 2, min: 0.5, max: 5 },
    ],
    allowedConditions: ["GREATER_THAN", "LESS_THAN"],
  },
  {
    type: "PRICE",
    label: "Цена",
    description: "Текущая цена инструмента",
    params: [],
    allowedConditions: ["GREATER_THAN", "LESS_THAN", "CROSSES_ABOVE", "CROSSES_BELOW", "EQUALS"],
  },
  {
    type: "VOLUME",
    label: "Объём",
    description: "Отношение текущего объёма к среднему",
    params: [
      { name: "period", label: "Период среднего", defaultValue: 20, min: 2, max: 200 },
    ],
    allowedConditions: ["GREATER_THAN", "MULTIPLIED_BY"],
  },
  {
    type: "PRICE_CHANGE",
    label: "Изменение цены",
    description: "Процентное изменение цены за N баров",
    params: [
      { name: "period", label: "Баров назад", defaultValue: 1, min: 1, max: 100 },
    ],
    allowedConditions: ["GREATER_THAN", "LESS_THAN", "ABOVE_BY_PERCENT", "BELOW_BY_PERCENT"],
  },
  {
    type: "SUPPORT",
    label: "Поддержка",
    description: "Ближайший уровень поддержки",
    params: [
      { name: "lookback", label: "Глубина анализа", defaultValue: 50, min: 10, max: 200 },
    ],
    allowedConditions: ["LESS_THAN", "CROSSES_BELOW"],
  },
  {
    type: "RESISTANCE",
    label: "Сопротивление",
    description: "Ближайший уровень сопротивления",
    params: [
      { name: "lookback", label: "Глубина анализа", defaultValue: 50, min: 10, max: 200 },
    ],
    allowedConditions: ["GREATER_THAN", "CROSSES_ABOVE"],
  },
]

export const getIndicatorConfig = (type: IndicatorType): IndicatorConfig | undefined =>
  INDICATORS.find((i) => i.type === type)
