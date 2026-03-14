import type { ConditionType, IndicatorType } from "./strategy"

export type SignalCondition = {
  indicator: IndicatorType
  params: Record<string, number>
  condition: ConditionType
  value?: number
}

export type SignalChannel = "telegram"

export type SignalChannels = SignalChannel[]
