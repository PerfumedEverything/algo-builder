"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { StrategyOperation, OperationStats } from "@/core/types"
import { OperationService } from "@/server/services"
import { PriceCache } from "@/server/services/price-cache"
import { getCurrentUserId } from "./helpers"

const getService = () => new OperationService()

export const getOperationsAction = async (
  strategyId: string,
): Promise<ApiResponse<StrategyOperation[]>> => {
  try {
    await getCurrentUserId()
    const operations = await getService().getOperations(strategyId)
    return successResponse(operations)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getOperationStatsAction = async (
  strategyId: string,
): Promise<ApiResponse<OperationStats>> => {
  try {
    await getCurrentUserId()
    const stats = await getService().getStats(strategyId)
    return successResponse(stats)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

type StatsWithPrices = {
  stats: Record<string, OperationStats>
  prices: Record<string, number>
}

export const getOperationStatsForStrategiesAction = async (
  strategyIds: string[],
  instrumentMap?: Record<string, string>,
): Promise<ApiResponse<StatsWithPrices>> => {
  try {
    await getCurrentUserId()
    const priceMap: Record<string, number> = {}
    if (instrumentMap) {
      const cache = new PriceCache()
      const uniqueInstruments = [...new Set(Object.values(instrumentMap))]
      const prices: Record<string, number> = {}
      for (const inst of uniqueInstruments) {
        const p = await cache.getPrice(inst)
        if (p !== null) prices[inst] = p
      }
      for (const id of strategyIds) {
        const inst = instrumentMap[id]
        if (inst && prices[inst]) priceMap[id] = prices[inst]
      }
    }
    const stats = await getService().getStatsForStrategies(strategyIds, priceMap)
    return successResponse({ stats, prices: priceMap })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
