export type IndicatorType =
  | "SMA"
  | "EMA"
  | "RSI"
  | "MACD"
  | "BOLLINGER"
  | "PRICE"
  | "VOLUME"
  | "PRICE_CHANGE"
  | "SUPPORT"
  | "RESISTANCE"

export type ConditionType =
  | "CROSSES_ABOVE"
  | "CROSSES_BELOW"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "EQUALS"
  | "BETWEEN"
  | "ABOVE_BY_PERCENT"
  | "BELOW_BY_PERCENT"
  | "MULTIPLIED_BY"

export type LogicOperator = "AND" | "OR"

export type StrategyCondition = {
  indicator: IndicatorType
  params: Record<string, number>
  condition: ConditionType
  value?: number
  timeframe?: string
}

export type StrategyRisks = {
  stopLoss?: number
  takeProfit?: number
  maxPositionSize?: number
  trailingStop?: number
}

export type StrategyConfig = {
  entry: StrategyCondition[]
  exit: StrategyCondition[]
  entryLogic: LogicOperator
  exitLogic: LogicOperator
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
