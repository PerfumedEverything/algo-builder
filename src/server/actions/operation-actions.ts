"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { StrategyOperation, OperationStats } from "@/core/types"
import { OperationService, StrategyService, BrokerService } from "@/server/services"
import { PriceCache } from "@/server/services/price-cache"
import { getCurrentUserId } from "./helpers"

const getService = () => new OperationService()

export type PaperStrategyRow = {
  strategyId: string
  strategyName: string
  instrument: string
  stats: OperationStats
  hasOpenPosition: boolean
}

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

export const getPaperPortfolioAction = async (): Promise<ApiResponse<PaperStrategyRow[]>> => {
  try {
    const userId = await getCurrentUserId()
    const strategyService = new StrategyService()
    const strategies = await strategyService.getStrategies(userId)
    if (strategies.length === 0) return successResponse([])

    const operationService = getService()
    const cache = new PriceCache()
    const rows: PaperStrategyRow[] = []

    for (const s of strategies) {
      const instrument = (s as Record<string, unknown>).instrument as string | undefined
      if (!instrument) continue

      let currentPrice: number | undefined
      try {
        const p = await cache.getPrice(instrument)
        if (p !== null) currentPrice = p
      } catch {}

      const stats = await operationService.getStats(s.id, currentPrice)
      if (stats.totalOperations === 0) continue

      const hasOpenPosition = stats.buyCount > stats.sellCount

      rows.push({
        strategyId: s.id,
        strategyName: (s as Record<string, unknown>).name as string ?? s.id,
        instrument,
        stats,
        hasOpenPosition,
      })
    }

    return successResponse(rows)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
