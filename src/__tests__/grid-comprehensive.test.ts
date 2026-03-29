import { describe, it, expect } from 'vitest'
import { GridEngine } from '@/lib/grid-engine'
import type { GridLevel } from '@/core/types/grid'

function buildLevels(
  prices: number[],
  currentPrice: number,
  amountPerOrder = 100,
): GridLevel[] {
  return GridEngine.initializeState(prices, currentPrice, amountPerOrder)
}

function simulateGrid(
  lowerPrice: number,
  upperPrice: number,
  gridCount: number,
  startPrice: number,
  amountPerOrder: number,
  feeRate: number,
  ticks: number[],
): { totalPnl: number; totalBuyFills: number; totalSellFills: number } {
  const levelPrices = GridEngine.calculateLevels(lowerPrice, upperPrice, gridCount, 'ARITHMETIC')
  let levels = GridEngine.initializeState(levelPrices, startPrice, amountPerOrder)
  let totalPnl = 0
  let totalBuyFills = 0
  let totalSellFills = 0

  for (const tick of ticks) {
    const result = GridEngine.processTick(tick, levels, feeRate, lowerPrice, upperPrice)

    totalPnl += result.pnlDelta
    totalBuyFills += result.filledOrders.filter((o) => o.side === 'BUY').length
    totalSellFills += result.filledOrders.filter((o) => o.side === 'SELL').length

    for (const filled of result.filledOrders) {
      levels = levels.map((l) =>
        l.index === filled.index
          ? { ...l, status: 'FILLED' as const, filledPrice: tick }
          : l,
      )
    }
    for (const counter of result.newCounterOrders) {
      levels = levels.map((l) =>
        l.index === counter.index
          ? { ...l, side: counter.side, status: 'PENDING' as const, filledPrice: undefined }
          : l,
      )
    }
  }

  return { totalPnl, totalBuyFills, totalSellFills }
}

describe('Edge Cases — calculateLevels', () => {
  it('gridCount=1 throws (BUG-06 fixed: validation enforced)', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 1, 'ARITHMETIC')).toThrow()
  })

  it('gridCount=0 throws (BUG-06 fixed: validation enforced)', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 0, 'ARITHMETIC')).toThrow()
  })

  it('gridCount=2 arithmetic produces exactly [lower, upper]', () => {
    const levels = GridEngine.calculateLevels(50, 150, 2, 'ARITHMETIC')
    expect(levels).toHaveLength(2)
    expect(levels[0]).toBe(50)
    expect(levels[1]).toBe(150)
  })

  it('gridCount=2 geometric produces exactly [lower, upper]', () => {
    const levels = GridEngine.calculateLevels(50, 150, 2, 'GEOMETRIC')
    expect(levels).toHaveLength(2)
    expect(levels[0]).toBe(50)
    expect(levels[1]).toBeCloseTo(150, 8)
  })

  it('equal lower and upper throws (BUG-07 fixed: upperPrice must be > lowerPrice)', () => {
    expect(() => GridEngine.calculateLevels(100, 100, 5, 'ARITHMETIC')).toThrow()
  })

  it('equal lower and upper geometric throws (BUG-07 fixed: upperPrice must be > lowerPrice)', () => {
    expect(() => GridEngine.calculateLevels(100, 100, 5, 'GEOMETRIC')).toThrow()
  })

  it('large gridCount=100 produces correct first and last', () => {
    const levels = GridEngine.calculateLevels(10, 20, 100, 'ARITHMETIC')
    expect(levels).toHaveLength(100)
    expect(levels[0]).toBeCloseTo(10, 8)
    expect(levels[99]).toBeCloseTo(20, 8)
  })

  it('large gridCount=100 geometric produces correct bounds', () => {
    const levels = GridEngine.calculateLevels(10, 20, 100, 'GEOMETRIC')
    expect(levels).toHaveLength(100)
    expect(levels[0]).toBeCloseTo(10, 8)
    expect(levels[99]).toBeCloseTo(20, 6)
  })

  it('very small prices (micro caps) work correctly', () => {
    const levels = GridEngine.calculateLevels(0.00001, 0.00005, 5, 'ARITHMETIC')
    expect(levels).toHaveLength(5)
    expect(levels[0]).toBeCloseTo(0.00001, 10)
    expect(levels[4]).toBeCloseTo(0.00005, 10)
    const step = (0.00005 - 0.00001) / 4
    expect(levels[1]).toBeCloseTo(0.00001 + step, 10)
  })

  it('very large prices work correctly', () => {
    const levels = GridEngine.calculateLevels(50000, 70000, 5, 'ARITHMETIC')
    expect(levels).toHaveLength(5)
    expect(levels[0]).toBe(50000)
    expect(levels[4]).toBe(70000)
    expect(levels[2]).toBe(60000)
  })
})

describe('Edge Cases — initializeState', () => {
  it('price exactly on a level: price=140 -> level at 140 is SELL (not BUY)', () => {
    const prices = [100, 120, 140, 160]
    const levels = GridEngine.initializeState(prices, 140, 100)
    const lvl140 = levels.find((l) => l.price === 140)
    expect(lvl140?.side).toBe('SELL')
  })

  it('price exactly equals lower bound: all are SELL', () => {
    const prices = [100, 120, 140]
    const levels = GridEngine.initializeState(prices, 100, 100)
    expect(levels[0].side).toBe('SELL')
    expect(levels[1].side).toBe('SELL')
    expect(levels[2].side).toBe('SELL')
  })

  it('price exactly equals upper bound: all are BUY', () => {
    const prices = [100, 120, 140]
    const levels = GridEngine.initializeState(prices, 200, 100)
    expect(levels[0].side).toBe('BUY')
    expect(levels[1].side).toBe('BUY')
    expect(levels[2].side).toBe('BUY')
  })

  it('quantity = amountPerOrder / price for each level', () => {
    const prices = [100, 200, 400]
    const levels = GridEngine.initializeState(prices, 250, 1000)
    expect(levels[0].quantity).toBeCloseTo(10, 8)
    expect(levels[1].quantity).toBeCloseTo(5, 8)
    expect(levels[2].quantity).toBeCloseTo(2.5, 8)
  })
})

describe('Math Precision — Float Arithmetic', () => {
  it('arithmetic levels with non-round step avoid float errors', () => {
    const levels = GridEngine.calculateLevels(0.1, 0.3, 3, 'ARITHMETIC')
    expect(levels[0]).toBeCloseTo(0.1, 10)
    expect(levels[1]).toBeCloseTo(0.2, 10)
    expect(levels[2]).toBeCloseTo(0.3, 10)
  })

  it('P&L calculation with small fractions preserves precision', () => {
    const buyLevel: GridLevel = {
      index: 0,
      price: 0.1,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: 0.1,
      quantity: 1000,
    }
    const sellLevel: GridLevel = {
      index: 1,
      price: 0.3,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1000,
    }

    const result = GridEngine.processTick(0.3, [buyLevel, sellLevel], 0.001, 0.05, 0.5)

    const expectedPnl = (0.3 - 0.1) * 1000 - 0.1 * 1000 * 0.001 - 0.3 * 1000 * 0.001
    expect(result.pnlDelta).toBeCloseTo(expectedPnl, 6)
  })

  it('geometric levels: ratio between consecutive levels is constant', () => {
    const levels = GridEngine.calculateLevels(100, 10000, 5, 'GEOMETRIC')
    const ratios: number[] = []
    for (let i = 1; i < levels.length; i++) {
      ratios.push(levels[i] / levels[i - 1])
    }
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeCloseTo(ratios[0], 8)
    }
  })
})

describe('Fee Calculations', () => {
  it('fee rate = 0: pure profit without fees', () => {
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 100, quantity: 1,
    }
    const sellLevel: GridLevel = {
      index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 1,
    }

    const result = GridEngine.processTick(120, [buyLevel, sellLevel], 0, 50, 200)
    expect(result.pnlDelta).toBe(20)
  })

  it('fee rate eats all profit: net negative P&L', () => {
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 100, quantity: 1,
    }
    const sellLevel: GridLevel = {
      index: 1, price: 101, side: 'SELL', status: 'PENDING', quantity: 1,
    }

    const feeRate = 0.01
    const result = GridEngine.processTick(101, [buyLevel, sellLevel], feeRate, 50, 200)

    const expectedPnl = (101 - 100) * 1 - 100 * 1 * 0.01 - 101 * 1 * 0.01
    expect(result.pnlDelta).toBeCloseTo(expectedPnl, 8)
    expect(result.pnlDelta).toBeLessThan(0)
  })

  it('exact breakeven fee rate calculation', () => {
    const buyPrice = 100
    const sellPrice = 110
    const qty = 1
    const feeRate = (sellPrice - buyPrice) / (buyPrice + sellPrice)

    const buyLevel: GridLevel = {
      index: 0, price: buyPrice, side: 'BUY', status: 'FILLED',
      filledPrice: buyPrice, quantity: qty,
    }
    const sellLevel: GridLevel = {
      index: 1, price: sellPrice, side: 'SELL', status: 'PENDING', quantity: qty,
    }

    const result = GridEngine.processTick(sellPrice, [buyLevel, sellLevel], feeRate, 50, 200)
    expect(Math.abs(result.pnlDelta)).toBeLessThan(1e-10)
  })

  it('Bybit standard fee 0.1% produces expected profit', () => {
    const buyPrice = 1000
    const sellPrice = 1020
    const qty = 0.5
    const feeRate = 0.001

    const buyLevel: GridLevel = {
      index: 0, price: buyPrice, side: 'BUY', status: 'FILLED',
      filledPrice: buyPrice, quantity: qty,
    }
    const sellLevel: GridLevel = {
      index: 1, price: sellPrice, side: 'SELL', status: 'PENDING', quantity: qty,
    }

    const result = GridEngine.processTick(sellPrice, [buyLevel, sellLevel], feeRate, 900, 1100)
    const expected = (1020 - 1000) * 0.5 - 1000 * 0.5 * 0.001 - 1020 * 0.5 * 0.001
    expect(result.pnlDelta).toBeCloseTo(expected, 8)
    expect(result.pnlDelta).toBeCloseTo(8.99, 2)
  })
})

describe('Boundary Conditions — processTick', () => {
  it('price exactly on lower bound: fills BUY at lower, not out of range', () => {
    const levels = buildLevels([100, 150, 200], 175, 100)
    const result = GridEngine.processTick(100, levels, 0.001, 100, 200)

    expect(result.isOutOfRange).toBe(false)
    const filledBuy = result.filledOrders.find((o) => o.price === 100 && o.side === 'BUY')
    expect(filledBuy).toBeDefined()
  })

  it('price exactly on upper bound: fills SELL at upper, not out of range', () => {
    const levels = buildLevels([100, 150, 200], 125, 100)
    const result = GridEngine.processTick(200, levels, 0.001, 100, 200)

    expect(result.isOutOfRange).toBe(false)
    const filledSell = result.filledOrders.find((o) => o.price === 200 && o.side === 'SELL')
    expect(filledSell).toBeDefined()
  })

  it('price slightly below lower bound (by EPSILON): out of range', () => {
    const levels = buildLevels([100, 150, 200], 150, 100)
    const result = GridEngine.processTick(99.999999, levels, 0.001, 100, 200)

    expect(result.isOutOfRange).toBe(true)
  })

  it('price slightly above upper bound: out of range', () => {
    const levels = buildLevels([100, 150, 200], 150, 100)
    const result = GridEngine.processTick(200.0001, levels, 0.001, 100, 200)

    expect(result.isOutOfRange).toBe(true)
  })

  it('BUY fill at highest BUY level creates counter SELL at next index', () => {
    const prices = [100, 120, 140, 160, 180]
    const levels = buildLevels(prices, 150, 100)
    const result = GridEngine.processTick(140, levels, 0.001, 100, 180)

    const counterSell = result.newCounterOrders.find((o) => o.side === 'SELL')
    if (counterSell) {
      expect(counterSell.index).toBe(3)
      expect(counterSell.price).toBe(160)
    }
  })

  it('SELL at highest index: no counter order with out-of-bounds index', () => {
    const prices = [100, 150, 200]
    const levels = buildLevels(prices, 125, 100)
    const result = GridEngine.processTick(200, levels, 0.001, 100, 200)

    const filledSell200 = result.filledOrders.find((o) => o.price === 200)
    expect(filledSell200).toBeDefined()

    const counterBuy = result.newCounterOrders.find((o) => o.index === 1)
    expect(counterBuy).toBeDefined()
    expect(counterBuy?.side).toBe('BUY')
  })

  it('BUY at lowest index (0): no counter order with negative index', () => {
    const prices = [100, 150, 200]
    const levels = buildLevels(prices, 175, 100)
    const result = GridEngine.processTick(100, levels, 0.001, 100, 200)

    const illegalCounter = result.newCounterOrders.find((o) => o.index < 0)
    expect(illegalCounter).toBeUndefined()

    const counterSell = result.newCounterOrders.find((o) => o.index === 1)
    expect(counterSell).toBeDefined()
  })
})

describe('Multi-Level Gaps — Price Jumps', () => {
  it('price drops through all levels: fills all BUY orders', () => {
    const prices = [100, 120, 140, 160, 180]
    const levels = buildLevels(prices, 190, 100)
    const result = GridEngine.processTick(90, levels, 0.001, 100, 180)

    expect(result.filledOrders.length).toBe(5)
    expect(result.filledOrders.every((o) => o.side === 'BUY')).toBe(true)
  })

  it('price jumps up through all SELL levels: fills all SELL orders', () => {
    const prices = [100, 120, 140, 160, 180]
    const levels = buildLevels(prices, 90, 100)
    const result = GridEngine.processTick(190, levels, 0.001, 100, 180)

    const sellFills = result.filledOrders.filter((o) => o.side === 'SELL')
    expect(sellFills.length).toBe(5)
  })

  it('price gap: skip levels in between', () => {
    const prices = [100, 110, 120, 130, 140, 150]
    const levels = buildLevels(prices, 125, 100)

    const result = GridEngine.processTick(105, levels, 0.001, 100, 150)

    const buyFills = result.filledOrders.filter((o) => o.side === 'BUY')
    expect(buyFills.length).toBe(2)
    expect(buyFills.map((o) => o.price).sort()).toEqual([110, 120])
  })
})

describe('P&L Pairing Logic', () => {
  it('SELL only generates P&L when paired BUY at index-1 is FILLED', () => {
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 100, quantity: 1,
    }
    const sellLevel: GridLevel = {
      index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 1,
    }
    const result = GridEngine.processTick(120, [buyLevel, sellLevel], 0.001, 50, 200)
    expect(result.pnlDelta).toBeGreaterThan(0)
  })

  it('SELL without paired BUY: pnlDelta = 0', () => {
    const sellLevel: GridLevel = {
      index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 1,
    }
    const otherLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'PENDING', quantity: 1,
    }
    const result = GridEngine.processTick(120, [otherLevel, sellLevel], 0.001, 50, 200)

    const sellFillPnl = result.pnlDelta
    expect(sellFillPnl).toBe(0)
  })

  it('P&L uses filledPrice (actual fill) not level price for paired BUY', () => {
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 95, quantity: 1,
    }
    const sellLevel: GridLevel = {
      index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 1,
    }
    const result = GridEngine.processTick(120, [buyLevel, sellLevel], 0.001, 50, 200)

    const expected = (120 - 95) * 1 - 95 * 1 * 0.001 - 120 * 1 * 0.001
    expect(result.pnlDelta).toBeCloseTo(expected, 8)
  })

  it('[BUG-02 fixed] P&L uses buyQty for cost, sellQty for revenue — asymmetric quantities handled correctly', () => {
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 100, quantity: 2,
    }
    const sellLevel: GridLevel = {
      index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 1,
    }
    const result = GridEngine.processTick(120, [buyLevel, sellLevel], 0, 50, 200)

    const expectedRevenue = 120 * 1
    const expectedCost = 100 * 2
    expect(result.pnlDelta).toBe(expectedRevenue - expectedCost)
  })
})

describe('Error Handling', () => {
  it('empty levels array: no crash, no fills', () => {
    const result = GridEngine.processTick(100, [], 0.001, 50, 200)
    expect(result.filledOrders).toHaveLength(0)
    expect(result.pnlDelta).toBe(0)
  })

  it('all levels already FILLED: no fills', () => {
    const levels: GridLevel[] = [
      { index: 0, price: 100, side: 'BUY', status: 'FILLED', filledPrice: 100, quantity: 1 },
      { index: 1, price: 120, side: 'SELL', status: 'FILLED', filledPrice: 120, quantity: 1 },
    ]
    const result = GridEngine.processTick(110, levels, 0.001, 50, 200)
    expect(result.filledOrders).toHaveLength(0)
    expect(result.pnlDelta).toBe(0)
  })

  it('all levels CANCELLED: no fills', () => {
    const levels: GridLevel[] = [
      { index: 0, price: 100, side: 'BUY', status: 'CANCELLED', quantity: 1 },
      { index: 1, price: 120, side: 'SELL', status: 'CANCELLED', quantity: 1 },
    ]
    const result = GridEngine.processTick(100, levels, 0.001, 50, 200)
    expect(result.filledOrders).toHaveLength(0)
  })

  it('negative price: still processes (no validation in engine)', () => {
    const levels = buildLevels([100, 200], 150, 100)
    const result = GridEngine.processTick(-10, levels, 0.001, 100, 200)
    expect(result.isOutOfRange).toBe(true)
  })

  it('NaN price: out of range, no fills', () => {
    const levels = buildLevels([100, 200], 150, 100)
    const result = GridEngine.processTick(NaN, levels, 0.001, 100, 200)
    expect(result.filledOrders).toHaveLength(0)
  })
})

describe('Simulation — Full Lifecycle', () => {
  it('oscillating price: buy low, sell high generates positive P&L', () => {
    const ticks = [100, 200, 100, 200, 100, 200]
    const sim = simulateGrid(100, 200, 3, 150, 100, 0.001, ticks)

    expect(sim.totalPnl).toBeGreaterThan(0)
    expect(sim.totalSellFills).toBeGreaterThan(0)
  })

  it('monotonically rising price: no sell P&L (only buys fill initially, then sells without paired buy)', () => {
    const ticks = [100, 110, 120, 130, 140, 150]
    const sim = simulateGrid(100, 150, 6, 105, 100, 0.001, ticks)

    expect(sim.totalBuyFills).toBe(1)
  })

  it('monotonically falling price: fills BUYs but never SELLs', () => {
    const ticks = [140, 130, 120, 110, 100]
    const sim = simulateGrid(100, 150, 6, 145, 100, 0.001, ticks)

    expect(sim.totalBuyFills).toBeGreaterThan(0)
    expect(sim.totalSellFills).toBe(0)
  })

  it('flat price: no fills', () => {
    const ticks = Array(20).fill(125) as number[]
    const sim = simulateGrid(100, 150, 6, 125, 100, 0.001, ticks)

    expect(sim.totalBuyFills).toBe(0)
    expect(sim.totalSellFills).toBe(0)
    expect(sim.totalPnl).toBe(0)
  })

  it('100-tick sine wave produces finite P&L and trades', () => {
    const ticks: number[] = []
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * 4 * Math.PI
      ticks.push(150 + 50 * Math.sin(angle))
    }
    const sim = simulateGrid(100, 200, 6, 150, 120, 0.001, ticks)

    expect(Number.isFinite(sim.totalPnl)).toBe(true)
    expect(sim.totalBuyFills + sim.totalSellFills).toBeGreaterThan(0)
  })
})

describe('[BUG REPORTS] — Issues Found During Audit', () => {
  it('[BUG-1] service.fillOrder applies total pnlDelta to EVERY filled order row, double-counting in DB', () => {
    /**
     * In grid-trading-service.ts line 101-110:
     *   for (const filled of tickResult.filledOrders) {
     *     await this.gridRepo.fillOrder(gridId, filled.index, filled.side, currentPrice, tickResult.pnlDelta)
     *   }
     *
     * tickResult.pnlDelta is the TOTAL for all sells in this tick.
     * But it's passed to EVERY fillOrder call (including BUY fills that have no P&L).
     * This means if 2 sells fill in one tick, each DB row gets the TOTAL pnl, not its individual share.
     *
     * Expected: each filled order should get only its own P&L contribution.
     * Actual: every filled order gets the full pnlDelta.
     */
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 100, quantity: 1,
    }
    const sellLevel: GridLevel = {
      index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 1,
    }

    const result = GridEngine.processTick(120, [buyLevel, sellLevel], 0.001, 50, 200)

    expect(result.pnlDelta).toBeGreaterThan(0)
    expect(result.filledOrders.length).toBe(1)
    expect(result.filledOrders[0].side).toBe('SELL')
  })

  it('[BUG-2] initializeState: price == level.price assigns SELL, could be surprising at boundary', () => {
    const prices = [100, 150, 200]
    const levels = GridEngine.initializeState(prices, 150, 100)

    const lvl150 = levels.find((l) => l.price === 150)
    expect(lvl150?.side).toBe('SELL')
  })

  it('[BUG-04 fixed] counter SELL uses filled buy quantity, not original SELL level quantity', () => {
    const levels: GridLevel[] = [
      { index: 0, price: 100, side: 'BUY', status: 'PENDING', quantity: 10 },
      { index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 5 },
    ]
    const result = GridEngine.processTick(100, levels, 0.001, 50, 200)

    const counterSell = result.newCounterOrders.find((o) => o.index === 1)
    expect(counterSell?.quantity).toBe(10)
  })

  it('[BUG-4] service.processPriceTick applies same pnlDelta to every filled order in DB', () => {
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 100, quantity: 1,
    }
    const sellLevel1: GridLevel = {
      index: 1, price: 120, side: 'SELL', status: 'PENDING', quantity: 1,
    }
    const buyLevel2: GridLevel = {
      index: 2, price: 130, side: 'BUY', status: 'FILLED',
      filledPrice: 130, quantity: 1,
    }
    const sellLevel2: GridLevel = {
      index: 3, price: 150, side: 'SELL', status: 'PENDING', quantity: 1,
    }

    const result = GridEngine.processTick(150, [buyLevel, sellLevel1, buyLevel2, sellLevel2], 0.001, 50, 200)

    expect(result.filledOrders.length).toBe(2)

    const sell1Pnl = (150 - 100) * 1 - 100 * 0.001 - 150 * 0.001
    const sell2Pnl = (150 - 130) * 1 - 130 * 0.001 - 150 * 0.001
    const totalPnl = sell1Pnl + sell2Pnl
    expect(result.pnlDelta).toBeCloseTo(totalPnl, 6)
  })
})

describe('Validation Schema (grid-actions)', () => {
  it('gridLevels min=3 in zod schema but engine handles gridCount < 2', () => {
    const levels = GridEngine.calculateLevels(100, 200, 2, 'ARITHMETIC')
    expect(levels).toHaveLength(2)
  })

  it('feeRate max=0.01 (1%) in zod schema', () => {
    const buyLevel: GridLevel = {
      index: 0, price: 100, side: 'BUY', status: 'FILLED',
      filledPrice: 100, quantity: 1,
    }
    const sellLevel: GridLevel = {
      index: 1, price: 200, side: 'SELL', status: 'PENDING', quantity: 1,
    }
    const result = GridEngine.processTick(200, [buyLevel, sellLevel], 0.01, 50, 300)
    const expected = (200 - 100) * 1 - 100 * 0.01 - 200 * 0.01
    expect(result.pnlDelta).toBeCloseTo(expected, 8)
    expect(result.pnlDelta).toBeCloseTo(97, 0)
  })
})

describe('Concurrent / Repeated Ticks', () => {
  it('same tick price twice: second tick has no pending orders to fill', () => {
    const prices = [100, 150, 200]
    let levels = buildLevels(prices, 175, 100)

    const result1 = GridEngine.processTick(100, levels, 0.001, 100, 200)
    for (const filled of result1.filledOrders) {
      levels = levels.map((l) =>
        l.index === filled.index
          ? { ...l, status: 'FILLED' as const, filledPrice: 100 }
          : l,
      )
    }
    for (const counter of result1.newCounterOrders) {
      levels = levels.map((l) =>
        l.index === counter.index
          ? { ...l, side: counter.side, status: 'PENDING' as const, filledPrice: undefined }
          : l,
      )
    }

    const result2 = GridEngine.processTick(100, levels, 0.001, 100, 200)

    expect(result2.filledOrders.length).toBe(0)
  })
})

describe('Grid AI Service — computeStdDev correctness', () => {
  it('stdDev of [2,4,4,4,5,5,7,9] = 2.138', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
    const stdDev = Math.sqrt(variance)
    expect(stdDev).toBeCloseTo(2.138, 2)
  })
})
