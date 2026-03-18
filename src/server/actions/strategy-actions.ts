"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { AiGeneratedStrategy, StrategyConfig } from "@/core/types"
import { createStrategySchema, updateStrategySchema } from "@/core/schemas"
import { StrategyService } from "@/server/services"
import { getAiProvider } from "@/server/providers/ai"
import { getCurrentUserId } from "./helpers"

const getService = () => new StrategyService(undefined, getAiProvider())

export const getStrategiesAction = async (
  filters?: { status?: string; search?: string },
): Promise<ApiResponse<Awaited<ReturnType<StrategyService["getStrategies"]>>>> => {
  try {
    const userId = await getCurrentUserId()
    const strategies = await getService().getStrategies(userId, filters)
    return successResponse(strategies)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getStrategyStatsAction = async (): Promise<
  ApiResponse<{ total: number; active: number; draft: number; archived: number }>
> => {
  try {
    const userId = await getCurrentUserId()
    const stats = await getService().getStats(userId)
    return successResponse(stats)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const createStrategyAction = async (
  data: {
    name: string
    description?: string
    instrument: string
    instrumentType?: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
    timeframe: string
    config: StrategyConfig
  },
): Promise<ApiResponse<{ id: string }>> => {
  try {
    const parsed = createStrategySchema.safeParse(data)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message)
    }
    const userId = await getCurrentUserId()
    const strategy = await getService().createStrategy(userId, data)
    return successResponse({ id: strategy.id })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const updateStrategyAction = async (
  id: string,
  data: {
    name?: string
    description?: string
    status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"
    instrument?: string
    instrumentType?: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
    timeframe?: string
    config?: StrategyConfig
  },
): Promise<ApiResponse<{ id: string }>> => {
  try {
    const parsed = updateStrategySchema.safeParse(data)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message)
    }
    const userId = await getCurrentUserId()
    const strategy = await getService().updateStrategy(id, userId, data)
    return successResponse({ id: strategy.id })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const deleteStrategyAction = async (
  id: string,
): Promise<ApiResponse<{ id: string }>> => {
  try {
    const userId = await getCurrentUserId()
    await getService().deleteStrategy(id, userId)
    return successResponse({ id })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const generateStrategyAction = async (
  prompt: string,
): Promise<ApiResponse<AiGeneratedStrategy>> => {
  try {
    if (!prompt.trim()) {
      return errorResponse("Prompt is required")
    }
    const strategy = await getService().generateWithAI(prompt)
    return successResponse(strategy)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
