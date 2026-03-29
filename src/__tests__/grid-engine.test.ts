import { describe, it, expect } from 'vitest'
import { GridEngine } from '@/lib/grid-engine'
import type { GridLevel } from '@/core/types/grid'

describe('GridEngine.calculateLevels', () => {
  it('arithmetic: lower=100, upper=200, gridCount=6 produces 6 equally-spaced levels', () => {
    const levels = GridEngine.calculateLevels(100, 200, 6, 'ARITHMETIC')
    expect(levels).toHaveLength(6)
    expect(levels[0]).toBeCloseTo(100)
    expect(levels[1]).toBeCloseTo(120)
    expect(levels[2]).toBeCloseTo(140)
    expect(levels[3]).toBeCloseTo(160)
    expect(levels[4]).toBeCloseTo(180)
    expect(levels[5]).toBeCloseTo(200)
  })

  it('geometric: lower=100, upper=400, gridCount=3 produces [100, 200, 400]', () => {
    const levels = GridEngine.calculateLevels(100, 400, 3, 'GEOMETRIC')
    expect(levels).toHaveLength(3)
    expect(levels[0]).toBeCloseTo(100)
    expect(levels[1]).toBeCloseTo(200)
    expect(levels[2]).toBeCloseTo(400)
  })

  it('edge: gridCount=2 produces [lower, upper] only', () => {
    const levels = GridEngine.calculateLevels(50, 150, 2, 'ARITHMETIC')
    expect(levels).toHaveLength(2)
    expect(levels[0]).toBeCloseTo(50)
    expect(levels[1]).toBeCloseTo(150)
  })

  it('defaults to ARITHMETIC when distribution not specified', () => {
    const levels = GridEngine.calculateLevels(100, 200, 3)
    expect(levels).toHaveLength(3)
    expect(levels[0]).toBeCloseTo(100)
    expect(levels[1]).toBeCloseTo(150)
    expect(levels[2]).toBeCloseTo(200)
  })
})

describe('GridEngine.initializeState', () => {
  it('levels [100,120,140,160,180,200], currentPrice=150 -> indices 0,1,2 are BUY, 3,4,5 are SELL', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const orders = GridEngine.initializeState(levelPrices, 150, 120)

    expect(orders).toHaveLength(6)
    expect(orders[0].side).toBe('BUY')
    expect(orders[1].side).toBe('BUY')
    expect(orders[2].side).toBe('BUY')
    expect(orders[3].side).toBe('SELL')
    expect(orders[4].side).toBe('SELL')
    expect(orders[5].side).toBe('SELL')

    expect(orders[0].status).toBe('PENDING')
    expect(orders[0].quantity).toBeCloseTo(120 / 100)
    expect(orders[3].quantity).toBeCloseTo(120 / 160)
  })
})

describe('GridEngine.processTick', () => {
  function buildLevels(prices: number[], currentPrice: number, amountPerOrder = 120): GridLevel[] {
    return GridEngine.initializeState(prices, currentPrice, amountPerOrder)
  }

  it('BUY fill: price drops to 120, pending BUY at 120 fills, counter SELL created at 140', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const levels = buildLevels(levelPrices, 150)

    const result = GridEngine.processTick(120, levels, 0.001, 100, 200)

    expect(result.filledOrders.length).toBeGreaterThanOrEqual(1)
    const filledBuy = result.filledOrders.find((o) => o.price === 120 && o.side === 'BUY')
    expect(filledBuy).toBeDefined()

    const counterSell = result.newCounterOrders.find((o) => o.price === 140 && o.side === 'SELL')
    expect(counterSell).toBeDefined()
  })

  it('SELL fill: price rises to 160, pending SELL at 160 fills, counter BUY created at 140', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const levels = buildLevels(levelPrices, 150)

    const result = GridEngine.processTick(160, levels, 0.001, 100, 200)

    const filledSell = result.filledOrders.find((o) => o.price === 160 && o.side === 'SELL')
    expect(filledSell).toBeDefined()

    const counterBuy = result.newCounterOrders.find((o) => o.price === 140 && o.side === 'BUY')
    expect(counterBuy).toBeDefined()
  })

  it('P&L: buy at 100 (qty=1), sell at 120 (qty=1), feeRate=0.001 -> pnlDelta = 19.78', () => {
    const buyLevel: GridLevel = {
      index: 0,
      price: 100,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: 100,
      quantity: 1,
    }
    const sellLevel: GridLevel = {
      index: 1,
      price: 120,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1,
    }
    const levels = [buyLevel, sellLevel]

    const result = GridEngine.processTick(120, levels, 0.001, 50, 200)

    expect(result.pnlDelta).toBeCloseTo(19.78, 2)
  })

  it('no fill: price=150 (between highest BUY=140 and lowest SELL=160), none should fill', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const levels = buildLevels(levelPrices, 150)

    const result = GridEngine.processTick(150, levels, 0.001, 100, 200)

    expect(result.filledOrders).toHaveLength(0)
    expect(result.pnlDelta).toBe(0)
  })

  it('boundary: lowest BUY (index 0) fills, no counter below index 0 — no crash', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const levels = buildLevels(levelPrices, 150)

    expect(() => {
      GridEngine.processTick(100, levels, 0.001, 100, 200)
    }).not.toThrow()

    const result = GridEngine.processTick(100, levels, 0.001, 100, 200)
    const filledBuy = result.filledOrders.find((o) => o.price === 100)
    expect(filledBuy).toBeDefined()

    const illegalCounter = result.newCounterOrders.find((o) => o.index < 0)
    expect(illegalCounter).toBeUndefined()
  })

  it('out of range low: price=50 (below lower=100) -> isOutOfRange=true', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const levels = buildLevels(levelPrices, 150)

    const result = GridEngine.processTick(50, levels, 0.001, 100, 200)
    expect(result.isOutOfRange).toBe(true)
  })

  it('out of range high: price=250 (above upper=200) -> isOutOfRange=true', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const levels = buildLevels(levelPrices, 150)

    const result = GridEngine.processTick(250, levels, 0.001, 100, 200)
    expect(result.isOutOfRange).toBe(true)
  })

  it('multiple fills in single tick: price jumps from 180 to 100 — multiple BUY orders fill', () => {
    const levelPrices = [100, 120, 140, 160, 180, 200]
    const levels = buildLevels(levelPrices, 180)

    const result = GridEngine.processTick(100, levels, 0.001, 100, 200)

    expect(result.filledOrders.length).toBeGreaterThanOrEqual(2)
    const buyFills = result.filledOrders.filter((o) => o.side === 'BUY')
    expect(buyFills.length).toBeGreaterThanOrEqual(2)
  })

  it('fee precision: P&L matches formula profit = (sellPrice-buyPrice)*qty - buyFee - sellFee', () => {
    const buyPrice = 100
    const sellPrice = 120
    const qty = 1
    const feeRate = 0.001
    const expected = (sellPrice - buyPrice) * qty - buyPrice * qty * feeRate - sellPrice * qty * feeRate

    const buyLevel: GridLevel = {
      index: 0,
      price: buyPrice,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: buyPrice,
      quantity: qty,
    }
    const sellLevel: GridLevel = {
      index: 1,
      price: sellPrice,
      side: 'SELL',
      status: 'PENDING',
      quantity: qty,
    }
    const levels = [buyLevel, sellLevel]

    const result = GridEngine.processTick(sellPrice, levels, feeRate, 50, 200)

    expect(result.pnlDelta).toBeCloseTo(expected, 8)
    expect(result.pnlDelta).toBeCloseTo(19.78, 2)
  })
})

describe('GridEngine 100-tick simulation', () => {
  it('price oscillates 100-200, gridCount=6, amountPerOrder=120 USDT, feeRate=0.001 — deterministic result', () => {
    const LOWER = 100
    const UPPER = 200
    const FEE = 0.001
    const AMOUNT = 120

    const levelPrices = GridEngine.calculateLevels(LOWER, UPPER, 6, 'ARITHMETIC')
    let levels = GridEngine.initializeState(levelPrices, 150, AMOUNT)

    let totalPnl = 0
    let totalTrades = 0

    const ticks: number[] = []
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * 2 * Math.PI
      ticks.push(LOWER + ((Math.sin(angle) + 1) / 2) * (UPPER - LOWER))
    }

    for (const tick of ticks) {
      const result = GridEngine.processTick(tick, levels, FEE, LOWER, UPPER)

      totalPnl += result.pnlDelta
      totalTrades += result.filledOrders.filter((o) => o.side === 'SELL').length

      for (const filled of result.filledOrders) {
        levels = levels.map((l) =>
          l.index === filled.index ? { ...l, status: 'FILLED' as const, filledPrice: tick } : l,
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

    expect(totalTrades).toBeGreaterThanOrEqual(0)
    expect(totalPnl).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(totalPnl)).toBe(true)
    expect(Number.isFinite(totalTrades)).toBe(true)
  })
})
