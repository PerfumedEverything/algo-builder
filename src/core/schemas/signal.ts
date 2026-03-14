import { z } from "zod"

import { conditionTypeSchema, indicatorTypeSchema } from "./strategy"

export const signalConditionSchema = z.object({
  indicator: indicatorTypeSchema,
  params: z.record(z.string(), z.number()),
  condition: conditionTypeSchema,
  value: z.number().optional(),
})

export const signalChannelSchema = z.enum(["telegram"])

export const createSignalSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  instrument: z.string().min(1),
  instrumentType: z.enum(["STOCK", "BOND", "CURRENCY", "FUTURES"]).default("STOCK"),
  timeframe: z.string().min(1),
  signalType: z.enum(["BUY", "SELL"]),
  conditions: z.array(signalConditionSchema).min(1),
  channels: z.array(signalChannelSchema).min(1),
})

export const updateSignalSchema = createSignalSchema.partial()
