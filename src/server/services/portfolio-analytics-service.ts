import { FUNDAMENTALS_MAP } from "@/core/data/fundamentals-map"
import type {
  CorrelationMatrix,
  SectorAllocation,
  AssetTypeBreakdown,
  TradeSuccessBreakdown,
  PortfolioPosition,
  ConcentrationIndex,
  BenchmarkComparison,
  AggregateDividendYield,
  InstrumentPnl,
} from "@/core/types"
import { OperationService } from "./operation-service"
import { StrategyRepository } from "@/server/repositories/strategy-repository"
import { CorrelationService } from "./correlation-service"
import { getAggregateDividendYield } from "./portfolio-dividend-service"
import { getBenchmarkComparison as fetchBenchmarkComparison } from "./portfolio-benchmark-service"

const ASSET_TYPE_LABELS: Record<string, string> = {
  STOCK: "Акции", ETF: "ETF", BOND: "Облигации", CURRENCY: "Валюта", FUTURES: "Фьючерсы",
}

export class PortfolioAnalyticsService {
  private operationService = new OperationService()
  private strategyRepo = new StrategyRepository()
  private correlationService = new CorrelationService()

  async getCorrelationMatrix(userId: string, days = 90): Promise<CorrelationMatrix> {
    return this.correlationService.getCorrelationMatrix(userId, days)
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
      breakEven: { count: 0 },
      byInstrument: [],
    }

    const strategyIds = strategies.map(s => s.id)
    const allStats = await this.operationService.getStatsForStrategies(strategyIds)
    const instrumentMap = new Map<string, { name: string; totalPnl: number; strategyCount: number }>()

    for (const strategy of strategies) {
      const stats = allStats[strategy.id]
      if (!stats || stats.totalOperations === 0) continue

      if (stats.pnl > 0) { result.profitable.count += 1; result.profitable.totalPnl += stats.pnl }
      else if (stats.pnl < 0) { result.unprofitable.count += 1; result.unprofitable.totalPnl += stats.pnl }
      else result.breakEven.count += 1

      const ticker = strategy.instrument
      const existing = instrumentMap.get(ticker)
      if (existing) { existing.totalPnl += stats.pnl; existing.strategyCount += 1 }
      else instrumentMap.set(ticker, { name: strategy.name ?? ticker, totalPnl: stats.pnl, strategyCount: 1 })
    }

    const byInstrument: InstrumentPnl[] = Array.from(instrumentMap.entries())
      .map(([ticker, data]) => ({ ticker, name: data.name, totalPnl: data.totalPnl, strategyCount: data.strategyCount }))
      .sort((a, b) => b.totalPnl - a.totalPnl)

    result.byInstrument = byInstrument
    return result
  }

  getConcentrationIndex(positions: PortfolioPosition[]): ConcentrationIndex {
    const totalValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0)
    if (totalValue <= 0) return { hhi: 0, level: "diversified", dominantPositions: [] }

    let hhi = 0
    const dominantPositions: { ticker: string; weight: number }[] = []

    for (const pos of positions) {
      const weight = (pos.quantity * pos.currentPrice) / totalValue
      hhi += weight * weight
      if (weight > 0.4) dominantPositions.push({ ticker: pos.ticker, weight })
    }

    hhi = Math.round(hhi * 10000) / 10000
    const level = hhi < 0.15 ? "diversified" : hhi < 0.25 ? "moderate" : "concentrated"
    return { hhi, level, dominantPositions }
  }

  async getBenchmarkComparison(userId: string, days = 90): Promise<BenchmarkComparison | null> {
    return fetchBenchmarkComparison(userId, days)
  }

  async getAggregateDividendYield(positions: PortfolioPosition[]): Promise<AggregateDividendYield> {
    return getAggregateDividendYield(positions)
  }

}
