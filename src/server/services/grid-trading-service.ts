import { GridEngine } from '@/lib/grid-engine'
import type { GridConfig, GridTickResult } from '@/core/types/grid'
import { GridRepository } from '@/server/repositories/grid-repository'
import type { GridOrderRow } from '@/server/repositories/grid-repository'
import { StrategyRepository } from '@/server/repositories/strategy-repository'
import { NotificationService } from '@/server/services/notification-service'

type CreateGridParams = {
  userId: string
  name: string
  instrument: string
  instrumentType: string
  config: GridConfig
  currentPrice: number
}

type StopGridResult = {
  cancelledCount: number
  stats: { totalBuys: number; totalSells: number; realizedPnl: number }
}

type GridStatusResult = {
  orders: GridOrderRow[]
  stats: { totalBuys: number; totalSells: number; realizedPnl: number }
}

export class GridTradingService {
  private gridRepo: GridRepository
  private strategyRepo: StrategyRepository
  private notifService: NotificationService

  constructor() {
    this.gridRepo = new GridRepository()
    this.strategyRepo = new StrategyRepository()
    this.notifService = new NotificationService()
  }

  async createGrid(params: CreateGridParams): Promise<string> {
    const { userId, name, instrument, instrumentType, config, currentPrice } = params

    const strategy = await this.strategyRepo.create({
      userId,
      name,
      instrument,
      instrumentType,
      timeframe: 'GRID',
      config,
    })

    await this.strategyRepo.update(strategy.id, userId, { status: 'ACTIVE' })

    const levelPrices = GridEngine.calculateLevels(
      config.lowerPrice,
      config.upperPrice,
      config.gridLevels,
      config.gridDistribution,
    )
    const gridLevels = GridEngine.initializeState(levelPrices, currentPrice, config.amountPerOrder)

    const orders = gridLevels.map((l) => ({
      levelIndex: l.index,
      price: l.price,
      side: l.side,
      quantity: l.quantity,
    }))

    await this.gridRepo.createOrders(strategy.id, userId, orders)

    return strategy.id
  }

  async processPriceTick(
    gridId: string,
    userId: string,
    currentPrice: number,
  ): Promise<GridTickResult> {
    const strategy = await this.strategyRepo.findById(gridId, userId)
    if (!strategy) throw new Error(`Grid strategy ${gridId} not found`)

    const config = strategy.config as GridConfig
    const allRows = await this.gridRepo.getOrdersByGridId(gridId, userId)

    const levels = allRows.map((r) => ({
      index: r.levelIndex,
      price: r.price,
      side: r.side,
      status: r.status,
      quantity: r.quantity,
      filledAt: r.filledAt ? new Date(r.filledAt) : undefined,
      filledPrice: r.filledPrice ?? undefined,
    }))

    const tickResult = GridEngine.processTick(
      currentPrice,
      levels,
      config.feeRate,
      config.lowerPrice,
      config.upperPrice,
    )

    for (const filled of tickResult.filledOrders) {
      const ok = await this.gridRepo.fillOrder(
        gridId,
        filled.index,
        filled.side,
        currentPrice,
        filled.pnlDelta ?? 0,
      )
      if (!ok) continue
    }

    for (const counter of tickResult.newCounterOrders) {
      await this.gridRepo.activateCounterOrder(
        gridId,
        counter.index,
        counter.side,
        counter.quantity,
        counter.price,
        userId,
      )
    }

    if (tickResult.isOutOfRange) {
      await this.notifService.sendNotification(
        userId,
        `Grid ${gridId} is out of range at price ${currentPrice}. Upper: ${config.upperPrice}, Lower: ${config.lowerPrice}.`,
      )
    }

    if (config.stopLoss && currentPrice <= config.stopLoss) {
      await this.stopGrid(gridId, userId)
      await this.notifService.sendNotification(
        userId,
        `Grid ${gridId} hit stop loss at ${currentPrice}`,
      )
    }

    if (config.takeProfit && currentPrice >= config.takeProfit) {
      await this.stopGrid(gridId, userId)
      await this.notifService.sendNotification(
        userId,
        `Grid ${gridId} hit take profit at ${currentPrice}`,
      )
    }

    return tickResult
  }

  async stopGrid(gridId: string, userId: string): Promise<StopGridResult> {
    const cancelledCount = await this.gridRepo.cancelAllPending(gridId, userId)
    await this.strategyRepo.update(gridId, userId, { status: 'PAUSED' })
    const stats = await this.gridRepo.getGridStats(gridId, userId)

    return { cancelledCount, stats }
  }

  async getGridStatus(gridId: string, userId: string): Promise<GridStatusResult> {
    const orders = await this.gridRepo.getOrdersByGridId(gridId, userId)
    const stats = await this.gridRepo.getGridStats(gridId, userId)

    return { orders, stats }
  }
}
