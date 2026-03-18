export type IndicatorType =
  | "SMA"
  | "EMA"
  | "RSI"
  | "MACD"
  | "BOLLINGER"
  | "PRICE"

export type ConditionType =
  | "CROSSES_ABOVE"
  | "CROSSES_BELOW"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "EQUALS"
  | "BETWEEN"

export type StrategyCondition = {
  indicator: IndicatorType
  params: Record<string, number>
  condition: ConditionType
  value?: number
}

export type StrategyRisks = {
  stopLoss?: number
  takeProfit?: number
  maxPositionSize?: number
  trailingStop?: number
}

export type StrategyConfig = {
  entry: StrategyCondition
  exit: StrategyCondition
  risks: StrategyRisks
}

export type AiGeneratedStrategy = {
  name: string
  instrument: string
  instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
  timeframe: string
  description: string
  config: StrategyConfig
}
