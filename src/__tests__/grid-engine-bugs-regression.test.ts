import { describe, it, expect } from 'vitest'
import { GridEngine } from '@/lib/grid-engine'
import type { GridLevel } from '@/core/types/grid'

describe('BUG-01 (engine): per-fill pnlDelta on each filled order', () => {
  it('two SELL fills in one tick: each filled order has pnlDelta, sum equals tickResult.pnlDelta', () => {
    const filledBuy1: GridLevel = {
      index: 2,
      price: 100,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: 100,
      quantity: 1,
    }
    const pendingSell1: GridLevel = {
      index: 3,
      price: 108,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1,
    }
    const filledBuy2: GridLevel = {
      index: 0,
      price: 95,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: 95,
      quantity: 1.053,
    }
    const pendingSell2: GridLevel = {
      index: 1,
      price: 110,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1.053,
    }

    const levels = [filledBuy2, pendingSell2, filledBuy1, pendingSell1]
    const result = GridEngine.processTick(112, levels, 0.001, 90, 120)

    expect(result.filledOrders).toHaveLength(2)

    const pnl0 = result.filledOrders[0].pnlDelta
    const pnl1 = result.filledOrders[1].pnlDelta

    expect(typeof pnl0).toBe('number')
    expect(typeof pnl1).toBe('number')

    const sumOfIndividual = (pnl0 ?? 0) + (pnl1 ?? 0)
    expect(sumOfIndividual).toBeCloseTo(result.pnlDelta, 6)
  })

  it('BUY fill pnlDelta is 0 (no P&L on buy side)', () => {
    const pendingBuy: GridLevel = {
      index: 0,
      price: 100,
      side: 'BUY',
      status: 'PENDING',
      quantity: 1,
    }
    const pendingSell: GridLevel = {
      index: 1,
      price: 110,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1,
    }

    const result = GridEngine.processTick(98, [pendingBuy, pendingSell], 0.001, 90, 120)

    const filledBuy = result.filledOrders.find((o) => o.side === 'BUY')
    expect(filledBuy?.pnlDelta).toBe(0)
  })
})

describe('BUG-02 (engine): P&L uses buy qty for cost, sell qty for revenue', () => {
  it('buy qty=2.0, sell qty=1.0 (fee=0): cost uses buy qty 2, revenue uses sell qty 1', () => {
    const feeRate = 0
    const buyPrice = 100
    const buyQty = 2.0
    const sellQty = 1.0

    const buyLevel: GridLevel = {
      index: 0,
      price: buyPrice,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: buyPrice,
      quantity: buyQty,
    }
    const sellLevel: GridLevel = {
      index: 1,
      price: 120,
      side: 'SELL',
      status: 'PENDING',
      quantity: sellQty,
    }

    const currentPrice = 120
    const result = GridEngine.processTick(currentPrice, [buyLevel, sellLevel], feeRate, 90, 130)

    const expectedRevenue = currentPrice * sellQty * (1 - feeRate)
    const expectedCost = buyPrice * buyQty * (1 + feeRate)
    const expectedPnl = expectedRevenue - expectedCost

    expect(result.pnlDelta).toBeCloseTo(expectedPnl, 4)
    expect(result.pnlDelta).toBeCloseTo(-80, 4)
  })
})

describe('BUG-03 (engine): paired buy found from FILLED status orders', () => {
  it('FILLED buy at index 0, PENDING sell at index 1 — engine finds FILLED paired buy and computes P&L', () => {
    const filledBuy: GridLevel = {
      index: 0,
      price: 100,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: 100,
      quantity: 1,
    }
    const pendingSell: GridLevel = {
      index: 1,
      price: 110,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1,
    }

    const result = GridEngine.processTick(110, [filledBuy, pendingSell], 0.001, 90, 120)

    expect(result.filledOrders).toHaveLength(1)
    expect(result.pnlDelta).toBeGreaterThan(0)
  })
})

describe('BUG-04 (engine): counter SELL order uses filled buy quantity', () => {
  it('BUY fills at index 3 with qty=1.0 — counter SELL at index 4 gets quantity=1.0', () => {
    const levels: GridLevel[] = [
      { index: 0, price: 90, side: 'SELL', status: 'PENDING', quantity: 1.111 },
      { index: 1, price: 96, side: 'SELL', status: 'PENDING', quantity: 1.041 },
      { index: 2, price: 102, side: 'SELL', status: 'PENDING', quantity: 0.98 },
      { index: 3, price: 108, side: 'BUY', status: 'PENDING', quantity: 1.0 },
      { index: 4, price: 114, side: 'SELL', status: 'PENDING', quantity: 0.877 },
    ]

    const result = GridEngine.processTick(108, levels, 0.001, 90, 120)

    const filledBuy = result.filledOrders.find((o) => o.index === 3 && o.side === 'BUY')
    expect(filledBuy).toBeDefined()

    const counterSell = result.newCounterOrders.find((o) => o.index === 4 && o.side === 'SELL')
    expect(counterSell).toBeDefined()

    expect(counterSell!.quantity).toBe(1.0)
    expect(counterSell!.quantity).not.toBe(0.877)
  })
})

describe('BUG-06/07 (engine): calculateLevels input validation', () => {
  it('BUG-06: gridCount=1 throws Error', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 1)).toThrow()
  })

  it('BUG-06: gridCount=0 throws Error', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 0)).toThrow()
  })

  it('BUG-07: lowerPrice=0 throws Error', () => {
    expect(() => GridEngine.calculateLevels(0, 200, 5)).toThrow()
  })

  it('BUG-07: lowerPrice negative throws Error', () => {
    expect(() => GridEngine.calculateLevels(-10, 200, 5)).toThrow()
  })

  it('BUG-07: upperPrice <= lowerPrice throws Error', () => {
    expect(() => GridEngine.calculateLevels(200, 100, 5)).toThrow()
  })

  it('BUG-07: upperPrice === lowerPrice throws Error', () => {
    expect(() => GridEngine.calculateLevels(100, 100, 5)).toThrow()
  })

  it('valid inputs: gridCount=2 does not throw', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 2)).not.toThrow()
  })

  it('valid inputs: large gridCount does not throw', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 30)).not.toThrow()
  })
})
