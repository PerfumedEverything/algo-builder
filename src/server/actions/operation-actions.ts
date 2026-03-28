"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { StrategyOperation, OperationStats } from "@/core/types"
import { OperationService, StrategyService, BrokerService } from "@/server/services"
import { PriceCache } from "@/server/services/price-cache"
import { getCurrentUserId } from "./helpers"


const getService = () => new OperationService()

export const getOperationsAction = async (
  strategyId: string,
): Promise<ApiResponse<StrategyOperation[]>> => {
  try {
    const userId = await getCurrentUserId()
    const strategyService = new StrategyService()
    const strategies = await strategyService.getStrategies(userId)
    if (!strategies.some((s) => s.id === strategyId)) {
      return errorResponse("Стратегия не найдена")
    }
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
    const userId = await getCurrentUserId()
    const strategyService = new StrategyService()
    const strategies = await strategyService.getStrategies(userId)
    if (!strategies.some((s) => s.id === strategyId)) {
      return errorResponse("Стратегия не найдена")
    }
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
    const userId = await getCurrentUserId()
    const strategyService = new StrategyService()
    const userStrategies = await strategyService.getStrategies(userId)
    const ownedIds = new Set(userStrategies.map((s) => s.id))
    const validIds = strategyIds.filter((id) => ownedIds.has(id))
    const priceMap: Record<string, number> = {}
    if (instrumentMap) {
      const broker = new BrokerService()
      const uniqueInstruments = [...new Set(Object.values(instrumentMap))]
      const prices: Record<string, number> = {}
      for (const inst of uniqueInstruments) {
        try {
          const p = await broker.getInstrumentPrice(userId, inst)
          prices[inst] = p
        } catch {
          const cache = new PriceCache()
          const cached = await cache.getPrice(inst)
          if (cached !== null) prices[inst] = cached
        }
      }
      for (const id of validIds) {
        const inst = instrumentMap[id]
        if (inst && prices[inst]) priceMap[id] = prices[inst]
      }
    }
    const stats = await getService().getStatsForStrategies(validIds, priceMap)
    return successResponse({ stats, prices: priceMap })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
