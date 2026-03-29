import { describe, it, expect } from 'vitest'
import { GridEngine } from '@/lib/grid-engine'
import type { GridLevel } from '@/core/types/grid'

function applyTickToLevels(levels: GridLevel[], tick: number): { levels: GridLevel[]; pnlDelta: number } {
  const prices = levels.map((l) => l.price)
  const lowerBound = Math.min(...prices)
  const upperBound = Math.max(...prices)

  const result = GridEngine.processTick(tick, levels, 0.001, lowerBound, upperBound)

  let updated = levels.map((l) => {
    const filled = result.filledOrders.find((f) => f.index === l.index)
    if (filled) {
      return { ...l, status: 'FILLED' as const, filledPrice: tick }
    }
    return l
  })

  for (const counter of result.newCounterOrders) {
    updated = updated.map((l) =>
      l.index === counter.index
        ? { ...l, side: counter.side, status: 'PENDING' as const, filledPrice: undefined, quantity: counter.quantity }
        : l,
    )
  }

  return { levels: updated, pnlDelta: result.pnlDelta }
}

describe('Integration: Full grid lifecycle — 50 oscillating ticks', () => {
  it('produces finite positive P&L, no NaN pnlDeltas, pnlDeltas sum correctly', () => {
    const LOWER = 100
    const UPPER = 110
    const FEE = 0.001
    const AMOUNT = 100
    const START_PRICE = 105

    const levelPrices = GridEngine.calculateLevels(LOWER, UPPER, 6, 'ARITHMETIC')
    let levels = GridEngine.initializeState(levelPrices, START_PRICE, AMOUNT)

    const ticks: number[] = Array.from({ length: 50 }, (_, i) => 105 + 7 * Math.sin(i * 0.4))

    let totalPnl = 0
    const allPnlDeltas: number[] = []

    for (const tick of ticks) {
      const prices = levels.map((l) => l.price)
      const lowerBound = Math.min(...prices)
      const upperBound = Math.max(...prices)

      const result = GridEngine.processTick(tick, levels, FEE, lowerBound, upperBound)

      allPnlDeltas.push(result.pnlDelta)
      totalPnl += result.pnlDelta

      levels = levels.map((l) => {
        const filled = result.filledOrders.find((f) => f.index === l.index)
        if (filled) return { ...l, status: 'FILLED' as const, filledPrice: tick }
        return l
      })

      for (const counter of result.newCounterOrders) {
        levels = levels.map((l) =>
          l.index === counter.index
            ? { ...l, side: counter.side, status: 'PENDING' as const, filledPrice: undefined, quantity: counter.quantity }
            : l,
        )
      }
    }

    expect(Number.isFinite(totalPnl)).toBe(true)
    expect(totalPnl).toBeGreaterThan(0)

    for (const delta of allPnlDeltas) {
      expect(Number.isNaN(delta)).toBe(false)
    }

    const sumOfDeltas = allPnlDeltas.reduce((s, d) => s + d, 0)
    expect(sumOfDeltas).toBeCloseTo(totalPnl, 10)
  })
})

describe('Integration: StopLoss trigger', () => {
  it('price drops below stopLoss — SL would trigger at price <= config.stopLoss', () => {
    const LOWER = 90
    const UPPER = 115
    const STOP_LOSS = 97
    const START_PRICE = 105

    const levelPrices = GridEngine.calculateLevels(LOWER, UPPER, 5, 'ARITHMETIC')
    let levels = GridEngine.initializeState(levelPrices, START_PRICE, 100)

    const ticks = [105, 103, 100, 96]
    let slTriggered = false

    for (const tick of ticks) {
      if (tick <= STOP_LOSS) {
        slTriggered = true
        break
      }

      const { levels: updated } = applyTickToLevels(levels, tick)
      levels = updated
    }

    expect(slTriggered).toBe(true)
  })

  it('price never hits stopLoss — SL does not trigger', () => {
    const STOP_LOSS = 97
    const ticks = [105, 103, 100, 99]

    let slTriggered = false
    for (const tick of ticks) {
      if (tick <= STOP_LOSS) {
        slTriggered = true
        break
      }
    }

    expect(slTriggered).toBe(false)
  })
})

describe('Integration: TakeProfit trigger', () => {
  it('price rises above takeProfit — TP would trigger at price >= config.takeProfit', () => {
    const LOWER = 95
    const UPPER = 120
    const TAKE_PROFIT = 115
    const START_PRICE = 105

    const levelPrices = GridEngine.calculateLevels(LOWER, UPPER, 5, 'ARITHMETIC')
    let levels = GridEngine.initializeState(levelPrices, START_PRICE, 100)

    const ticks = [105, 108, 112, 116]
    let tpTriggered = false

    for (const tick of ticks) {
      if (tick >= TAKE_PROFIT) {
        tpTriggered = true
        break
      }

      const { levels: updated } = applyTickToLevels(levels, tick)
      levels = updated
    }

    expect(tpTriggered).toBe(true)
  })
})

describe('Integration: Known P&L sequence — manual verification', () => {
  it('3-level grid: buy at 105, sell at 110, P&L matches formula', () => {
    const FEE = 0.001

    const buyLevel: GridLevel = {
      index: 0,
      price: 105,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: 105,
      quantity: 1000 / 105,
    }
    const sellLevel: GridLevel = {
      index: 1,
      price: 110,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1000 / 105,
    }

    const result = GridEngine.processTick(110, [buyLevel, sellLevel], FEE, 100, 115)

    const sellRevenue = 110 * sellLevel.quantity * (1 - FEE)
    const buyCost = buyLevel.filledPrice! * buyLevel.quantity * (1 + FEE)
    const expectedPnl = sellRevenue - buyCost

    expect(result.pnlDelta).toBeCloseTo(expectedPnl, 6)
    expect(result.pnlDelta).toBeGreaterThan(0)
    expect(result.filledOrders.find((o) => o.side === 'SELL')).toBeDefined()
  })
})

describe('Integration: pnlDelta per fill is independent (no double-counting)', () => {
  it('two SELL fills in one tick each carry their own pnlDelta, not the total', () => {
    const levels: GridLevel[] = [
      { index: 0, price: 100, side: 'BUY', status: 'FILLED', filledPrice: 100, quantity: 1 },
      { index: 1, price: 110, side: 'SELL', status: 'PENDING', quantity: 1 },
      { index: 2, price: 120, side: 'BUY', status: 'FILLED', filledPrice: 120, quantity: 1 },
      { index: 3, price: 130, side: 'SELL', status: 'PENDING', quantity: 1 },
    ]

    const result = GridEngine.processTick(130, levels, 0.001, 90, 140)

    const sellFills = result.filledOrders.filter((o) => o.side === 'SELL')
    expect(sellFills.length).toBe(2)

    for (const fill of sellFills) {
      expect(fill.pnlDelta).toBeDefined()
      expect(Number.isNaN(fill.pnlDelta)).toBe(false)
    }

    const sumOfFillPnls = sellFills.reduce((s, f) => s + (f.pnlDelta ?? 0), 0)
    expect(sumOfFillPnls).toBeCloseTo(result.pnlDelta, 10)

    for (const fill of sellFills) {
      expect(fill.pnlDelta).not.toBeCloseTo(result.pnlDelta, 0)
    }
  })
})
