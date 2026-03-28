"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { OperationStats } from "@/core/types"
import { StrategyService, OperationService, BrokerService } from "@/server/services"
import { PriceCache } from "@/server/services/price-cache"
import { getCurrentUserId } from "./helpers"

export type PaperStrategyRow = {
  strategyId: string
  strategyName: string
  instrument: string
  stats: OperationStats
  hasOpenPosition: boolean
  profitableOps: number
  unprofitableOps: number
}

export const getPaperPortfolioAction = async (
  from?: string,
  to?: string,
): Promise<ApiResponse<PaperStrategyRow[]>> => {
  try {
    const userId = await getCurrentUserId()
    const strategyService = new StrategyService()
    const strategies = await strategyService.getStrategies(userId)
    if (strategies.length === 0) return successResponse([])

    const operationService = new OperationService()
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
      let ops = await operationService.getOperations(s.id)
      const hasDateFilter = Boolean(from || to)
      if (from) ops = ops.filter((o) => new Date(o.createdAt) >= new Date(from))
      if (to) ops = ops.filter((o) => new Date(o.createdAt) <= new Date(to))

      let stats: OperationStats
      if (hasDateFilter) {
        const buysFiltered = ops.filter((o) => o.type === "BUY")
        const sellsFiltered = ops.filter((o) => o.type === "SELL")
        const buyQty = buysFiltered.reduce((s, o) => s + o.quantity, 0)
        const sellQty = sellsFiltered.reduce((s, o) => s + o.quantity, 0)
        const buyAmount = buysFiltered.reduce((s, o) => s + o.amount, 0)
        const sellAmount = sellsFiltered.reduce((s, o) => s + o.amount, 0)
        const holdingQty = buyQty - sellQty
        const holdingValue = holdingQty > 0 && currentPrice ? holdingQty * currentPrice : 0
        const pnl = sellAmount - buyAmount + holdingValue
        const lastBuy = buysFiltered.length > 0 ? buysFiltered[buysFiltered.length - 1].price : 0
        stats = {
          totalOperations: ops.length,
          buyCount: buysFiltered.length,
          sellCount: sellsFiltered.length,
          initialAmount: buyAmount,
          currentAmount: sellAmount + holdingValue,
          holdingQty,
          pnl,
          pnlPercent: buyAmount > 0 ? (pnl / buyAmount) * 100 : 0,
          lastBuyPrice: lastBuy,
        }
      } else {
        stats = await operationService.getStats(s.id, currentPrice)
      }

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
