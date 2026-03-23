import type { PositionOperation, PositionLot } from "@/core/types"

export type FifoSummary = {
  lots: PositionLot[]
  totalQuantity: number
  avgPrice: number
  totalCost: number
  currentValue: number
  totalPnl: number
  totalPnlPercent: number
}

type BuyEntry = {
  date: string
  price: number
  remaining: number
}

export class FifoCalculator {
  static calculateSummary(operations: PositionOperation[], currentPrice: number): FifoSummary {
    const lots = this.calculate(operations, currentPrice)
    const totalQuantity = lots.reduce((s, l) => s + l.remainingQuantity, 0)
    const totalCost = lots.reduce((s, l) => s + l.buyPrice * l.remainingQuantity, 0)
    const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
    const currentValue = totalQuantity * currentPrice
    const totalPnl = currentValue - totalCost
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

    return { lots, totalQuantity, avgPrice, totalCost, currentValue, totalPnl, totalPnlPercent }
  }

  static calculate(operations: PositionOperation[], currentPrice: number): PositionLot[] {
    const sorted = [...operations].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    const buyQueue: BuyEntry[] = []

    for (const op of sorted) {
      if (op.type === "BUY") {
        buyQueue.push({ date: op.date, price: op.price, remaining: op.quantity })
      } else {
        let toSell = op.quantity
        for (const buy of buyQueue) {
          if (toSell <= 0) break
          const consumed = Math.min(buy.remaining, toSell)
          buy.remaining -= consumed
          toSell -= consumed
        }
      }
    }

    return buyQueue
      .filter((b) => b.remaining > 0)
      .map((b) => ({
        buyDate: b.date,
        buyPrice: b.price,
        quantity: b.remaining,
        remainingQuantity: b.remaining,
        currentPrice,
        pnl: (currentPrice - b.price) * b.remaining,
        pnlPercent: b.price > 0 ? ((currentPrice - b.price) / b.price) * 100 : 0,
      }))
  }
}
