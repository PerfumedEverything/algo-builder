import type { PositionOperation, PositionLot } from "@/core/types"

type BuyEntry = {
  date: string
  price: number
  remaining: number
}

export class FifoCalculator {
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
