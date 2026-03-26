import { sampleCorrelation } from "simple-statistics"
import { FUNDAMENTALS_MAP } from "@/core/data/fundamentals-map"
import type { CorrelationMatrix, SectorAllocation, AssetTypeBreakdown, TradeSuccessBreakdown, PortfolioPosition } from "@/core/types"
import { AppError } from "@/core/errors/app-error"
import { BrokerService } from "./broker-service"
import { OperationService } from "./operation-service"
import { StrategyRepository } from "@/server/repositories/strategy-repository"

const ASSET_TYPE_LABELS: Record<string, string> = {
  STOCK: "Акции", ETF: "ETF", BOND: "Облигации", CURRENCY: "Валюта", FUTURES: "Фьючерсы",
}

const toReturns = (closes: number[]) => closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])

export class PortfolioAnalyticsService {
  private broker = new BrokerService()
  private operationService = new OperationService()
  private strategyRepo = new StrategyRepository()

  async getCorrelationMatrix(userId: string): Promise<CorrelationMatrix> {
    const portfolio = await this.broker.getPortfolio(userId)
    if (!portfolio) throw AppError.badRequest("Портфель не найден")

    const positions = portfolio.positions.filter(
      (p) => p.instrumentType === "STOCK" || p.instrumentType === "ETF"
    )
    if (positions.length < 2) return { tickers: positions.map((p) => p.ticker), matrix: [], highPairs: [] }

    const now = new Date()
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const returnsArr: number[][] = []

    for (let i = 0; i < positions.length; i += 3) {
      const batch = positions.slice(i, i + 3)
      const results = await Promise.all(
        batch.map((p) => this.broker.getCandles(userId, { instrumentId: p.instrumentId, from, to: now, interval: "day" }))
      )
      for (const candles of results) {
        returnsArr.push(candles.length < 2 ? [] : toReturns(candles.map((c) => c.close)))
      }
    }

    const tickers = positions.map((p) => p.ticker)
    const n = tickers.length
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    const highPairs: CorrelationMatrix["highPairs"] = []

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1
      for (let j = i + 1; j < n; j++) {
        const minLen = Math.min(returnsArr[i].length, returnsArr[j].length)
        if (minLen < 5) { matrix[i][j] = matrix[j][i] = 0; continue }
        const corr = Math.round(sampleCorrelation(returnsArr[i].slice(0, minLen), returnsArr[j].slice(0, minLen)) * 100) / 100
        matrix[i][j] = matrix[j][i] = corr
        if (Math.abs(corr) > 0.7) highPairs.push({ a: tickers[i], b: tickers[j], corr })
      }
    }

    return { tickers, matrix, highPairs }
  }

  getSectorAllocation(positions: PortfolioPosition[]): SectorAllocation[] {
    const sectorMap = new Map<string, { value: number; tickers: string[] }>()
    let totalValue = 0

    for (const pos of positions) {
      const sector = FUNDAMENTALS_MAP[pos.ticker]?.sector ?? "other"
      const value = pos.quantity * pos.currentPrice
      totalValue += value
      const existing = sectorMap.get(sector)
      if (existing) { existing.value += value; existing.tickers.push(pos.ticker) }
      else sectorMap.set(sector, { value, tickers: [pos.ticker] })
    }

    return Array.from(sectorMap.entries())
      .map(([sector, data]) => ({
        sector, value: data.value, tickers: data.tickers,
        percent: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }

  getAssetTypeBreakdown(positions: PortfolioPosition[]): AssetTypeBreakdown[] {
    const typeMap = new Map<string, { value: number; count: number }>()
    let totalValue = 0

    for (const pos of positions) {
      const value = pos.quantity * pos.currentPrice
      totalValue += value
      const existing = typeMap.get(pos.instrumentType)
      if (existing) { existing.value += value; existing.count += 1 }
      else typeMap.set(pos.instrumentType, { value, count: 1 })
    }

    return Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type, label: ASSET_TYPE_LABELS[type] ?? type, value: data.value, count: data.count,
        percent: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }

  async getTradeSuccessBreakdown(userId: string): Promise<TradeSuccessBreakdown> {
    const strategies = await this.strategyRepo.findByUserId(userId)
    const result: TradeSuccessBreakdown = {
      profitable: { count: 0, totalPnl: 0 },
      unprofitable: { count: 0, totalPnl: 0 },
    }

    for (const strategy of strategies) {
      const stats = await this.operationService.getStats(strategy.id)
      if (stats.totalOperations === 0) continue
      if (stats.pnl > 0) { result.profitable.count += 1; result.profitable.totalPnl += stats.pnl }
      else if (stats.pnl < 0) { result.unprofitable.count += 1; result.unprofitable.totalPnl += stats.pnl }
    }

    return result
  }
}
