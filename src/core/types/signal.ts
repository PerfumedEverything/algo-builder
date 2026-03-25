import type { ConditionType, IndicatorType, LogicOperator } from "./strategy"

export type SignalCondition = {
  indicator: IndicatorType
  params: Record<string, number>
  condition: ConditionType
  value?: number
  valueTo?: number
  timeframe?: string
}

export type SignalChannel = "telegram"

export type SignalWithLogic = {
  conditions: SignalCondition[]
  logicOperator: LogicOperator
}
