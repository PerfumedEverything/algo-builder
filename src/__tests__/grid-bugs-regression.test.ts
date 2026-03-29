import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GridEngine } from '@/lib/grid-engine'
import type { GridLevel, GridConfig, GridTickResult } from '@/core/types/grid'

const mockGridRepo = vi.hoisted(() => ({
  createOrders: vi.fn(),
  getPendingOrders: vi.fn(),
  getOrdersByGridId: vi.fn(),
  fillOrder: vi.fn(),
  activateCounterOrder: vi.fn(),
  cancelAllPending: vi.fn(),
  getGridStats: vi.fn(),
}))

const mockStrategyRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
}))

const mockNotifService = vi.hoisted(() => ({
  sendNotification: vi.fn(),
}))

const mockGridEngine = vi.hoisted(() => ({
  calculateLevels: vi.fn(),
  initializeState: vi.fn(),
  processTick: vi.fn(),
}))

vi.mock('@/lib/grid-engine', () => ({
  GridEngine: mockGridEngine,
}))

vi.mock('@/server/repositories/grid-repository', () => {
  function GridRepository(this: unknown) {
    return mockGridRepo
  }
  return { GridRepository }
})

vi.mock('@/server/repositories/strategy-repository', () => {
  function StrategyRepository(this: unknown) {
    return mockStrategyRepo
  }
  return { StrategyRepository }
})

vi.mock('@/server/services/notification-service', () => {
  function NotificationService(this: unknown) {
    return mockNotifService
  }
  return { NotificationService }
})

import { GridTradingService } from '@/server/services/grid-trading-service'

const GRID_CONFIG: GridConfig = {
  type: 'GRID',
  lowerPrice: 90,
  upperPrice: 120,
  gridLevels: 6,
  amountPerOrder: 100,
  gridDistribution: 'ARITHMETIC',
  feeRate: 0.001,
}

const GRID_CONFIG_WITH_SL_TP: GridConfig = {
  ...GRID_CONFIG,
  stopLoss: 95,
  takeProfit: 120,
}

describe('BUG-01: no double P&L on multi-fill tick', () => {
  it('two SELL fills in one tick: each filled order has its own pnlDelta, sum equals tickResult.pnlDelta', () => {
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

  it('BUG-01 (service): service passes per-fill pnlDelta, not total, to fillOrder', async () => {
    const service = new GridTradingService()
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)

    const filledSell1: GridLevel = {
      index: 1,
      price: 108,
      side: 'SELL',
      status: 'FILLED',
      filledPrice: 112,
      pnlDelta: 5.5,
    } as GridLevel & { pnlDelta: number }

    const filledSell2: GridLevel = {
      index: 3,
      price: 110,
      side: 'SELL',
      status: 'FILLED',
      filledPrice: 112,
      pnlDelta: 7.3,
    } as GridLevel & { pnlDelta: number }

    const tickResult: GridTickResult = {
      filledOrders: [filledSell1, filledSell2],
      newCounterOrders: [],
      pnlDelta: 12.8,
      isOutOfRange: false,
    }

    mockGridEngine.processTick.mockReturnValue(tickResult)
    mockGridRepo.getOrdersByGridId.mockResolvedValue([])
    mockGridRepo.fillOrder.mockResolvedValue(true)
    mockGridRepo.activateCounterOrder.mockResolvedValue(undefined)

    await service.processPriceTick('grid-1', 'user-1', 112)

    expect(mockGridRepo.fillOrder).toHaveBeenCalledTimes(2)
    expect(mockGridRepo.fillOrder).toHaveBeenCalledWith('grid-1', 1, 'SELL', 112, 5.5)
    expect(mockGridRepo.fillOrder).toHaveBeenCalledWith('grid-1', 3, 'SELL', 112, 7.3)
    expect(mockGridRepo.fillOrder).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), expect.anything(), 12.8,
    )
  })
})

describe('BUG-02: P&L uses buy qty for cost, sell qty for revenue', () => {
  it('buy qty=1.0, sell qty=0.909: cost uses buy qty, revenue uses sell qty', () => {
    const feeRate = 0.001
    const buyPrice = 100
    const buyQty = 1.0
    const sellQty = 0.909

    const buyLevel: GridLevel = {
      index: 2,
      price: buyPrice,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: buyPrice,
      quantity: buyQty,
    }
    const sellLevel: GridLevel = {
      index: 3,
      price: 110,
      side: 'SELL',
      status: 'PENDING',
      quantity: sellQty,
    }

    const currentPrice = 112
    const result = GridEngine.processTick(currentPrice, [buyLevel, sellLevel], feeRate, 90, 120)

    const expectedRevenue = currentPrice * sellQty * (1 - feeRate)
    const expectedCost = buyPrice * buyQty * (1 + feeRate)
    const expectedPnl = expectedRevenue - expectedCost

    expect(result.pnlDelta).toBeCloseTo(expectedPnl, 4)

    const wrongPnl = (currentPrice - buyPrice) * sellQty - buyPrice * sellQty * feeRate - currentPrice * sellQty * feeRate
    expect(result.pnlDelta).not.toBeCloseTo(wrongPnl, 4)
  })
})

describe('BUG-03: paired buy found even when FILLED status', () => {
  it('FILLED buy at index 2, PENDING sell at index 3 — engine finds paired buy and computes positive P&L', () => {
    const filledBuy: GridLevel = {
      index: 2,
      price: 100,
      side: 'BUY',
      status: 'FILLED',
      filledPrice: 100,
      quantity: 1,
    }
    const pendingSell: GridLevel = {
      index: 3,
      price: 110,
      side: 'SELL',
      status: 'PENDING',
      quantity: 1,
    }

    const result = GridEngine.processTick(110, [filledBuy, pendingSell], 0.001, 90, 120)

    expect(result.filledOrders).toHaveLength(1)
    expect(result.pnlDelta).toBeGreaterThan(0)
  })

  it('BUG-03 (service): service uses getOrdersByGridId (all orders) so engine sees FILLED buys', async () => {
    const service = new GridTradingService()
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)

    const filledBuyRow = {
      id: 'ord-0',
      gridId: 'grid-1',
      userId: 'user-1',
      levelIndex: 2,
      price: 100,
      side: 'BUY' as const,
      quantity: 1,
      status: 'FILLED' as const,
      filledAt: new Date().toISOString(),
      filledPrice: 100,
      realizedPnl: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const pendingSellRow = {
      id: 'ord-1',
      gridId: 'grid-1',
      userId: 'user-1',
      levelIndex: 3,
      price: 110,
      side: 'SELL' as const,
      quantity: 1,
      status: 'PENDING' as const,
      filledAt: null,
      filledPrice: null,
      realizedPnl: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockGridRepo.getOrdersByGridId.mockResolvedValue([filledBuyRow, pendingSellRow])

    const emptyTickResult: GridTickResult = {
      filledOrders: [],
      newCounterOrders: [],
      pnlDelta: 0,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(emptyTickResult)
    mockGridRepo.fillOrder.mockResolvedValue(true)

    await service.processPriceTick('grid-1', 'user-1', 110)

    expect(mockGridRepo.getOrdersByGridId).toHaveBeenCalledWith('grid-1', 'user-1')
    expect(mockGridRepo.getPendingOrders).not.toHaveBeenCalled()
  })
})

describe('BUG-04: counter SELL order uses filled buy quantity', () => {
  it('BUY fills at index 3 with qty=1.0 — counter SELL at index 4 has quantity=1.0, not original level qty', () => {
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

describe('BUG-06/07: calculateLevels validation', () => {
  it('BUG-06: gridCount=1 throws Error', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 1)).toThrow()
  })

  it('BUG-07: lowerPrice=0 throws Error', () => {
    expect(() => GridEngine.calculateLevels(0, 200, 5)).toThrow()
  })

  it('BUG-07: upperPrice <= lowerPrice throws Error', () => {
    expect(() => GridEngine.calculateLevels(200, 100, 5)).toThrow()
  })

  it('BUG-07: upperPrice === lowerPrice throws Error', () => {
    expect(() => GridEngine.calculateLevels(100, 100, 5)).toThrow()
  })

  it('valid inputs: does not throw', () => {
    expect(() => GridEngine.calculateLevels(100, 200, 5)).not.toThrow()
  })
})

describe('BUG-10: SL/TP triggers stopGrid', () => {
  let service: GridTradingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GridTradingService()
  })

  it('price <= stopLoss: stopGrid is called and grid paused', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG_WITH_SL_TP }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)
    mockGridRepo.getOrdersByGridId.mockResolvedValue([])

    const emptyTickResult: GridTickResult = {
      filledOrders: [],
      newCounterOrders: [],
      pnlDelta: 0,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(emptyTickResult)
    mockGridRepo.cancelAllPending.mockResolvedValue(0)
    mockStrategyRepo.update.mockResolvedValue({})
    mockGridRepo.getGridStats.mockResolvedValue({ totalBuys: 0, totalSells: 0, realizedPnl: 0 })
    mockNotifService.sendNotification.mockResolvedValue(undefined)

    await service.processPriceTick('grid-1', 'user-1', 94)

    expect(mockGridRepo.cancelAllPending).toHaveBeenCalledWith('grid-1', 'user-1')
    expect(mockStrategyRepo.update).toHaveBeenCalledWith(
      'grid-1',
      'user-1',
      expect.objectContaining({ status: 'PAUSED' }),
    )
  })

  it('price >= takeProfit: stopGrid is called and grid paused', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG_WITH_SL_TP }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)
    mockGridRepo.getOrdersByGridId.mockResolvedValue([])

    const emptyTickResult: GridTickResult = {
      filledOrders: [],
      newCounterOrders: [],
      pnlDelta: 0,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(emptyTickResult)
    mockGridRepo.cancelAllPending.mockResolvedValue(0)
    mockStrategyRepo.update.mockResolvedValue({})
    mockGridRepo.getGridStats.mockResolvedValue({ totalBuys: 0, totalSells: 0, realizedPnl: 0 })
    mockNotifService.sendNotification.mockResolvedValue(undefined)

    await service.processPriceTick('grid-1', 'user-1', 121)

    expect(mockGridRepo.cancelAllPending).toHaveBeenCalledWith('grid-1', 'user-1')
    expect(mockStrategyRepo.update).toHaveBeenCalledWith(
      'grid-1',
      'user-1',
      expect.objectContaining({ status: 'PAUSED' }),
    )
  })

  it('price inside SL/TP range: stopGrid is NOT called', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG_WITH_SL_TP }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)
    mockGridRepo.getOrdersByGridId.mockResolvedValue([])

    const emptyTickResult: GridTickResult = {
      filledOrders: [],
      newCounterOrders: [],
      pnlDelta: 0,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(emptyTickResult)
    mockGridRepo.fillOrder.mockResolvedValue(true)

    await service.processPriceTick('grid-1', 'user-1', 107)

    expect(mockGridRepo.cancelAllPending).not.toHaveBeenCalled()
  })
})
