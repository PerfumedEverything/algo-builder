import { z } from "zod"

export const indicatorTypeSchema = z.enum([
  "SMA",
  "EMA",
  "RSI",
  "MACD",
  "BOLLINGER",
  "PRICE",
])

export const conditionTypeSchema = z.enum([
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "BETWEEN",
])

export const strategyConditionSchema = z.object({
  indicator: indicatorTypeSchema,
  params: z.record(z.string(), z.number()),
  condition: conditionTypeSchema,
  value: z.number().optional(),
})

export const strategyRisksSchema = z.object({
  stopLoss: z.number().min(0).max(100).optional(),
  takeProfit: z.number().min(0).max(1000).optional(),
  maxPositionSize: z.number().min(1).optional(),
  trailingStop: z.number().min(0).max(100).optional(),
})

export const strategyConfigSchema = z.object({
  entry: strategyConditionSchema,
  exit: strategyConditionSchema,
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
