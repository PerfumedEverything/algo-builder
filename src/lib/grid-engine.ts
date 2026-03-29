import type { GridDistribution, GridLevel, GridTickResult } from '@/core/types/grid'

const EPSILON = 1e-8

export class GridEngine {
  static calculateLevels(
    lowerPrice: number,
    upperPrice: number,
    gridCount: number,
    distribution: GridDistribution = 'ARITHMETIC',
  ): number[] {
    if (gridCount < 2) {
      return [lowerPrice, upperPrice]
    }

    if (distribution === 'GEOMETRIC') {
      return Array.from({ length: gridCount }, (_, i) =>
        lowerPrice * Math.pow(upperPrice / lowerPrice, i / (gridCount - 1)),
      )
    }

    const step = (upperPrice - lowerPrice) / (gridCount - 1)
    return Array.from({ length: gridCount }, (_, i) => lowerPrice + i * step)
  }

  static initializeState(
    levelPrices: number[],
    currentPrice: number,
    amountPerOrder: number,
  ): GridLevel[] {
    return levelPrices.map((price, index) => ({
      index,
      price,
      side: price < currentPrice ? 'BUY' : 'SELL',
      status: 'PENDING',
      quantity: amountPerOrder / price,
    }))
  }

  static processTick(
    currentPrice: number,
    levels: GridLevel[],
    feeRate: number,
    lowerBound: number,
    upperBound: number,
  ): GridTickResult {
    const isOutOfRange = currentPrice < lowerBound - EPSILON || currentPrice > upperBound + EPSILON

    const filledOrders: GridLevel[] = []
    const newCounterOrders: GridLevel[] = []
    let pnlDelta = 0

    for (const level of levels) {
      if (level.status !== 'PENDING') continue

      const isBuyFill = level.side === 'BUY' && currentPrice <= level.price + EPSILON
      const isSellFill = level.side === 'SELL' && currentPrice >= level.price - EPSILON

      if (!isBuyFill && !isSellFill) continue

      const filled: GridLevel = {
        ...level,
        status: 'FILLED',
        filledAt: new Date(),
        filledPrice: currentPrice,
      }
      filledOrders.push(filled)

      if (level.side === 'SELL' && level.status === 'PENDING') {
        const pairedBuy = levels.find(
          (l) => l.index === level.index - 1 && l.status === 'FILLED',
        )
        if (pairedBuy !== undefined && pairedBuy.filledPrice !== undefined) {
          const buyPrice = pairedBuy.filledPrice
          const sellPrice = currentPrice
          const qty = level.quantity
          const buyFee = buyPrice * qty * feeRate
          const sellFee = sellPrice * qty * feeRate
          pnlDelta += (sellPrice - buyPrice) * qty - buyFee - sellFee
        }
      }

      if (level.side === 'BUY') {
        const counterIndex = level.index + 1
        if (counterIndex < levels.length) {
          newCounterOrders.push({
            index: counterIndex,
            price: levels[counterIndex].price,
            side: 'SELL',
            status: 'PENDING',
            quantity: levels[counterIndex].quantity,
          })
        }
      } else {
        const counterIndex = level.index - 1
        if (counterIndex >= 0) {
          newCounterOrders.push({
            index: counterIndex,
            price: levels[counterIndex].price,
            side: 'BUY',
            status: 'PENDING',
            quantity: levels[counterIndex].quantity,
          })
        }
      }
    }

    return { filledOrders, newCounterOrders, pnlDelta, isOutOfRange }
  }
}
