import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GridConfig, GridTickResult, GridLevel } from '@/core/types/grid'

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

describe('BUG-01 (service): per-fill pnlDelta passed to fillOrder', () => {
  let service: GridTradingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GridTradingService()
  })

  it('service passes per-fill pnlDelta to fillOrder, not total tickResult.pnlDelta', async () => {
    const mockStrategy = { id: 'grid-1', config: GRID_CONFIG }
    mockStrategyRepo.findById.mockResolvedValue(mockStrategy)

    const filledSell1: GridLevel & { pnlDelta: number } = {
      index: 1,
      price: 108,
      side: 'SELL',
      status: 'FILLED',
      filledPrice: 112,
      quantity: 1,
      pnlDelta: 5.5,
    }

    const filledSell2: GridLevel & { pnlDelta: number } = {
      index: 3,
      price: 110,
      side: 'SELL',
      status: 'FILLED',
      filledPrice: 112,
      quantity: 1.053,
      pnlDelta: 7.3,
    }

    const tickResult: GridTickResult = {
      filledOrders: [filledSell1, filledSell2],
      newCounterOrders: [],
      pnlDelta: 12.8,
      isOutOfRange: false,
    }

    mockGridEngine.processTick.mockReturnValue(tickResult)
    mockGridRepo.getOrdersByGridId.mockResolvedValue([])
    mockGridRepo.fillOrder.mockResolvedValue(true)

    await service.processPriceTick('grid-1', 'user-1', 112)

    expect(mockGridRepo.fillOrder).toHaveBeenCalledTimes(2)
    expect(mockGridRepo.fillOrder).toHaveBeenCalledWith('grid-1', 1, 'SELL', 112, 5.5)
    expect(mockGridRepo.fillOrder).toHaveBeenCalledWith('grid-1', 3, 'SELL', 112, 7.3)
    expect(mockGridRepo.fillOrder).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), expect.anything(), 12.8,
    )
  })
})

describe('BUG-03 (service): uses getOrdersByGridId to include FILLED orders', () => {
  let service: GridTradingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GridTradingService()
  })

  it('service calls getOrdersByGridId (not getPendingOrders) so FILLED buys are visible to engine', async () => {
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

describe('BUG-10 (service): SL/TP triggers stopGrid', () => {
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
