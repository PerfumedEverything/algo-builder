import { z } from "zod"

export const indicatorTypeSchema = z.enum([
  "SMA",
  "EMA",
  "RSI",
  "MACD",
  "BOLLINGER",
  "PRICE",
  "VOLUME",
  "PRICE_CHANGE",
  "SUPPORT",
  "RESISTANCE",
])

export const conditionTypeSchema = z.enum([
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "BETWEEN",
  "ABOVE_BY_PERCENT",
  "BELOW_BY_PERCENT",
  "MULTIPLIED_BY",
])

export const logicOperatorSchema = z.enum(["AND", "OR"])

export const strategyConditionSchema = z.object({
  indicator: indicatorTypeSchema,
  params: z.record(z.string(), z.number()),
  condition: conditionTypeSchema,
  value: z.number().optional(),
  timeframe: z.string().optional(),
})

export const strategyRisksSchema = z.object({
  stopLoss: z.number().min(0).max(100).optional(),
  takeProfit: z.number().min(0).max(1000).optional(),
  maxPositionSize: z.number().min(1).optional(),
  trailingStop: z.number().min(0).max(100).optional(),
})

export const strategyConfigSchema = z.object({
  entry: z.array(strategyConditionSchema).min(1),
  exit: z.array(strategyConditionSchema).min(1),
  entryLogic: logicOperatorSchema.default("AND"),
  exitLogic: logicOperatorSchema.default("AND"),
  risks: strategyRisksSchema,
})

export const createStrategySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  instrument: z.string().min(1),
  instrumentType: z.enum(["STOCK", "BOND", "CURRENCY", "FUTURES"]).default("STOCK"),
  timeframe: z.string().min(1),
  config: strategyConfigSchema,
})

export const updateStrategySchema = createStrategySchema.partial().extend({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
})
