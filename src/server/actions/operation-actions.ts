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
  profitableOps: number
  unprofitableOps: number
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
    const broker = new BrokerService()
    const cache = new PriceCache()

    const uniqueInstruments = [
      ...new Set(
        strategies
          .map((s) => ((s as Record<string, unknown>).instrument as string | undefined) ?? "")
          .filter((i) => i !== "" && i !== "—"),
      ),
    ]

    const prices: Record<string, number> = {}
    for (const inst of uniqueInstruments) {
      try {
        prices[inst] = await broker.getInstrumentPrice(userId, inst)
      } catch {
        const cached = await cache.getPrice(inst)
        if (cached !== null) prices[inst] = cached
      }
    }

    const rows: PaperStrategyRow[] = []

    for (const s of strategies) {
      const instrument = ((s as Record<string, unknown>).instrument as string | undefined) ?? "—"
      const currentPrice = instrument !== "—" ? prices[instrument] : undefined
      const ops = await operationService.getOperations(s.id)
      const stats = await operationService.getStats(s.id, currentPrice)
      const hasOpenPosition = stats.buyCount > stats.sellCount

      let profitableOps = 0
      let unprofitableOps = 0
      const buys = ops.filter((o) => o.type === "BUY")
      const sells = ops.filter((o) => o.type === "SELL")

      if (buys.length > 0 && sells.length > 0) {
        const avgBuyPrice = buys.reduce((s, o) => s + o.amount, 0) / buys.reduce((s, o) => s + o.quantity, 0)
        for (const sell of sells) {
          const sellPrice = sell.amount / sell.quantity
          if (sellPrice > avgBuyPrice) profitableOps++
          else unprofitableOps++
        }
      }

      rows.push({
        strategyId: s.id,
        strategyName: (s as Record<string, unknown>).name as string ?? s.id,
        instrument,
        stats,
        hasOpenPosition,
        profitableOps,
        unprofitableOps,
      })
    }

    return successResponse(rows)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
