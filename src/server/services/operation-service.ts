import type { OperationStats, StrategyOperation } from "@/core/types"
import { OperationRepository } from "@/server/repositories"

export class OperationService {
  private repo = new OperationRepository()

  async recordOperation(input: {
    strategyId: string
    userId: string
    type: "BUY" | "SELL"
    instrument: string
    price: number
    tradeAmount?: number
  }): Promise<StrategyOperation> {
    const amount = input.tradeAmount ?? 10_000
    const quantity = Math.floor(amount / input.price)
    const actualAmount = quantity * input.price

    return this.repo.create({
      strategyId: input.strategyId,
      userId: input.userId,
      type: input.type,
      instrument: input.instrument,
      price: input.price,
      quantity: Math.max(quantity, 1),
      amount: actualAmount > 0 ? actualAmount : input.price,
    })
  }

  async getOperations(strategyId: string): Promise<StrategyOperation[]> {
    return this.repo.findByStrategyId(strategyId)
  }

  async getStats(strategyId: string, currentPrice?: number): Promise<OperationStats> {
    const ops = await this.repo.getStatsByStrategyId(strategyId)

    if (ops.length === 0) {
      return {
        totalOperations: 0,
        buyCount: 0,
        sellCount: 0,
        initialAmount: 0,
        currentAmount: 0,
        holdingQty: 0,
        pnl: 0,
        pnlPercent: 0,
        lastBuyPrice: 0,
      }
    }

    const buys = ops.filter((o) => o.type === "BUY")
    const sells = ops.filter((o) => o.type === "SELL")
    const lastBuy = [...ops].reverse().find((o) => o.type === "BUY")

    let totalBought = 0
    let totalBuyAmount = 0
    let totalSold = 0
    let totalSellAmount = 0
    let holdingQty = 0

    for (const op of ops) {
      if (op.type === "BUY") {
        totalBought += op.quantity
        totalBuyAmount += op.amount
        holdingQty += op.quantity
      } else {
        totalSold += op.quantity
        totalSellAmount += op.amount
        holdingQty -= op.quantity
      }
    }

    const realizedPnl = totalSellAmount - (totalSold > 0 ? (totalBuyAmount / totalBought) * totalSold : 0)
    const unrealizedPnl = holdingQty > 0 && currentPrice
      ? holdingQty * currentPrice - holdingQty * (totalBuyAmount / totalBought)
      : 0
    const pnl = realizedPnl + unrealizedPnl
    const pnlPercent = totalBuyAmount > 0 ? (pnl / totalBuyAmount) * 100 : 0

    return {
      totalOperations: ops.length,
      buyCount: buys.length,
      sellCount: sells.length,
      initialAmount: totalBuyAmount,
      currentAmount: totalBuyAmount + pnl,
      holdingQty,
      pnl,
      pnlPercent,
      lastBuyPrice: lastBuy?.price ?? 0,
    }
  }

  async getLastBuyPrice(strategyId: string): Promise<number> {
    const ops = await this.repo.findByStrategyId(strategyId)
    const lastBuy = [...ops].reverse().find((o) => o.type === "BUY")
    return lastBuy?.price ?? 0
  }

  async getStatsForStrategies(
    strategyIds: string[],
    priceMap?: Record<string, number>,
  ): Promise<Record<string, OperationStats>> {
    const result: Record<string, OperationStats> = {}
    for (const id of strategyIds) {
      result[id] = await this.getStats(id, priceMap?.[id])
    }
    return result
  }
}
