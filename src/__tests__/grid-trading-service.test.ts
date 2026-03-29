import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GridConfig, GridLevel, GridTickResult } from '@/core/types/grid'
import type { GridOrderRow } from '@/server/repositories/grid-repository'

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
  lowerPrice: 100,
  upperPrice: 200,
  gridLevels: 5,
  amountPerOrder: 1000,
  gridDistribution: 'ARITHMETIC',
  feeRate: 0.001,
}

const MOCK_LEVELS: number[] = [100, 125, 150, 175, 200]

const MOCK_GRID_LEVELS: GridLevel[] = MOCK_LEVELS.map((price, index) => ({
  index,
  price,
  side: price < 150 ? 'BUY' : 'SELL',
  status: 'PENDING',
  quantity: 1000 / price,
}))

function makeOrderRow(level: GridLevel, gridId = 'grid-1', userId = 'user-1'): GridOrderRow {
  return {
    id: `ord-${level.index}`,
    gridId,
    userId,
    levelIndex: level.index,
    price: level.price,
    side: level.side,
    quantity: level.quantity,
    status: level.status,
    filledAt: null,
    filledPrice: null,
    realizedPnl: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('GridTradingService', () => {
  let service: GridTradingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GridTradingService()
  })

  it('Test 1: createGrid — creates strategy, calculates levels, persists orders to repository', async () => {
    const mockStrategy = { id: 'strategy-123', config: GRID_CONFIG }
    mockStrategyRepo.create.mockResolvedValue(mockStrategy)
    mockStrategyRepo.update.mockResolvedValue(mockStrategy)
    mockGridEngine.calculateLevels.mockReturnValue(MOCK_LEVELS)
    mockGridEngine.initializeState.mockReturnValue(MOCK_GRID_LEVELS)
    mockGridRepo.createOrders.mockResolvedValue(undefined)

    const result = await service.createGrid({
      userId: 'user-1',
      name: 'Test Grid',
      instrument: 'SBER',
      instrumentType: 'STOCK',
      config: GRID_CONFIG,
      currentPrice: 150,
    })

    expect(result).toBe('strategy-123')
    expect(mockStrategyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', config: GRID_CONFIG }),
    )
    expect(mockGridEngine.calculateLevels).toHaveBeenCalledWith(100, 200, 5, 'ARITHMETIC')
    expect(mockGridEngine.initializeState).toHaveBeenCalledWith(MOCK_LEVELS, 150, 1000)
    expect(mockGridRepo.createOrders).toHaveBeenCalledWith(
      'strategy-123',
      'user-1',
      expect.arrayContaining([expect.objectContaining({ levelIndex: 0 })]),
    )
  })

  it('Test 2: processPriceTick — BUY fill triggers counter SELL via repository', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)

    const buyOrder = makeOrderRow({ ...MOCK_GRID_LEVELS[0], side: 'BUY' })
    mockGridRepo.getPendingOrders.mockResolvedValue([buyOrder])

    const counterSell: GridLevel = { index: 1, price: 125, side: 'SELL', status: 'PENDING', quantity: 8 }
    const tickResult: GridTickResult = {
      filledOrders: [{ ...MOCK_GRID_LEVELS[0], status: 'FILLED', filledPrice: 100 }],
      newCounterOrders: [counterSell],
      pnlDelta: 0,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(tickResult)
    mockGridRepo.fillOrder.mockResolvedValue(true)
    mockGridRepo.activateCounterOrder.mockResolvedValue(undefined)

    await service.processPriceTick('grid-1', 'user-1', 100)

    expect(mockGridRepo.fillOrder).toHaveBeenCalledWith('grid-1', 0, 'BUY', 100, expect.any(Number))
    expect(mockGridRepo.activateCounterOrder).toHaveBeenCalledWith(
      'grid-1', 1, 'SELL', counterSell.quantity, counterSell.price, 'user-1',
    )
  })

  it('Test 3: processPriceTick — SELL fill triggers counter BUY via repository', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)

    const sellOrder = makeOrderRow({ ...MOCK_GRID_LEVELS[4], side: 'SELL' })
    mockGridRepo.getPendingOrders.mockResolvedValue([sellOrder])

    const counterBuy: GridLevel = { index: 3, price: 175, side: 'BUY', status: 'PENDING', quantity: 5.7 }
    const tickResult: GridTickResult = {
      filledOrders: [{ ...MOCK_GRID_LEVELS[4], status: 'FILLED', filledPrice: 200 }],
      newCounterOrders: [counterBuy],
      pnlDelta: 12.5,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(tickResult)
    mockGridRepo.fillOrder.mockResolvedValue(true)
    mockGridRepo.activateCounterOrder.mockResolvedValue(undefined)

    await service.processPriceTick('grid-1', 'user-1', 200)

    expect(mockGridRepo.fillOrder).toHaveBeenCalledWith('grid-1', 4, 'SELL', 200, expect.any(Number))
    expect(mockGridRepo.activateCounterOrder).toHaveBeenCalledWith(
      'grid-1', 3, 'BUY', counterBuy.quantity, counterBuy.price, 'user-1',
    )
  })

  it('Test 4: processPriceTick — out of range triggers notification', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)
    mockGridRepo.getPendingOrders.mockResolvedValue([])

    const tickResult: GridTickResult = {
      filledOrders: [],
      newCounterOrders: [],
      pnlDelta: 0,
      isOutOfRange: true,
    }
    mockGridEngine.processTick.mockReturnValue(tickResult)
    mockNotifService.sendNotification.mockResolvedValue(undefined)

    await service.processPriceTick('grid-1', 'user-1', 50)

    expect(mockNotifService.sendNotification).toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('out of range'),
    )
  })

  it('Test 5: stopGrid — cancels all pending, returns stats', async () => {
    mockGridRepo.cancelAllPending.mockResolvedValue(4)
    mockStrategyRepo.update.mockResolvedValue({})
    mockGridRepo.getGridStats.mockResolvedValue({
      totalBuys: 3,
      totalSells: 2,
      realizedPnl: 150.5,
    })

    const result = await service.stopGrid('grid-1', 'user-1')

    expect(result.cancelledCount).toBe(4)
    expect(result.stats.totalBuys).toBe(3)
    expect(result.stats.totalSells).toBe(2)
    expect(result.stats.realizedPnl).toBe(150.5)
    expect(mockGridRepo.cancelAllPending).toHaveBeenCalledWith('grid-1', 'user-1')
    expect(mockStrategyRepo.update).toHaveBeenCalledWith(
      'grid-1', 'user-1', expect.objectContaining({ status: 'PAUSED' }),
    )
  })

  it('Test 6: processPriceTick — no fill when price is between levels', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)

    const pendingOrders = MOCK_GRID_LEVELS.map((l) => makeOrderRow(l))
    mockGridRepo.getPendingOrders.mockResolvedValue(pendingOrders)

    const emptyTickResult: GridTickResult = {
      filledOrders: [],
      newCounterOrders: [],
      pnlDelta: 0,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(emptyTickResult)

    await service.processPriceTick('grid-1', 'user-1', 137)

    expect(mockGridRepo.fillOrder).not.toHaveBeenCalled()
    expect(mockGridRepo.activateCounterOrder).not.toHaveBeenCalled()
    expect(mockNotifService.sendNotification).not.toHaveBeenCalled()
  })

  it('Test 7: processPriceTick — multiple fills in single tick (price gap scenario)', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)

    const pendingOrders = [0, 1, 2].map((i) => makeOrderRow({ ...MOCK_GRID_LEVELS[i], side: 'BUY' }))
    mockGridRepo.getPendingOrders.mockResolvedValue(pendingOrders)

    const multiTickResult: GridTickResult = {
      filledOrders: [
        { ...MOCK_GRID_LEVELS[0], status: 'FILLED', filledPrice: 100 },
        { ...MOCK_GRID_LEVELS[1], status: 'FILLED', filledPrice: 125 },
        { ...MOCK_GRID_LEVELS[2], status: 'FILLED', filledPrice: 150 },
      ],
      newCounterOrders: [
        { index: 1, price: 125, side: 'SELL', status: 'PENDING', quantity: 8 },
        { index: 2, price: 150, side: 'SELL', status: 'PENDING', quantity: 6.67 },
        { index: 3, price: 175, side: 'SELL', status: 'PENDING', quantity: 5.71 },
      ],
      pnlDelta: 0,
      isOutOfRange: false,
    }
    mockGridEngine.processTick.mockReturnValue(multiTickResult)
    mockGridRepo.fillOrder.mockResolvedValue(true)
    mockGridRepo.activateCounterOrder.mockResolvedValue(undefined)

    await service.processPriceTick('grid-1', 'user-1', 80)

    expect(mockGridRepo.fillOrder).toHaveBeenCalledTimes(3)
    expect(mockGridRepo.activateCounterOrder).toHaveBeenCalledTimes(3)
  })
})
