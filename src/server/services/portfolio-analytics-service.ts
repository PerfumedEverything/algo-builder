import { sampleCorrelation } from "simple-statistics"
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
import { AppError } from "@/core/errors/app-error"
import { MOEXProvider } from "@/server/providers/analytics/moex-provider"
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

  async getCorrelationMatrix(userId: string, days = 90): Promise<CorrelationMatrix> {
    const portfolio = await this.broker.getPortfolio(userId)
    if (!portfolio) throw AppError.badRequest("Портфель не найден")

    const positions = portfolio.positions.filter(
      (p) => p.instrumentType === "STOCK" || p.instrumentType === "ETF"
    )
    if (positions.length < 2) return { tickers: positions.map((p) => p.ticker), matrix: [], highPairs: [] }

    const now = new Date()
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
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
      breakEven: { count: 0 },
      byInstrument: [],
    }

    const strategyIds = strategies.map(s => s.id)
    const allStats = await this.operationService.getStatsForStrategies(strategyIds)

    const instrumentMap = new Map<string, { name: string; totalPnl: number; strategyCount: number }>()

    for (const strategy of strategies) {
      const stats = allStats[strategy.id]
      if (!stats || stats.totalOperations === 0) continue

      if (stats.pnl > 0) {
        result.profitable.count += 1
        result.profitable.totalPnl += stats.pnl
      } else if (stats.pnl < 0) {
        result.unprofitable.count += 1
        result.unprofitable.totalPnl += stats.pnl
      } else {
        result.breakEven.count += 1
      }

      const ticker = strategy.instrument
      const existing = instrumentMap.get(ticker)
      if (existing) {
        existing.totalPnl += stats.pnl
        existing.strategyCount += 1
      } else {
        instrumentMap.set(ticker, { name: strategy.name ?? ticker, totalPnl: stats.pnl, strategyCount: 1 })
      }
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
    try {
      const now = new Date()
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const fromStr = from.toISOString().slice(0, 10)
      const tillStr = now.toISOString().slice(0, 10)

      const portfolio = await this.broker.getPortfolio(userId)
      if (!portfolio || portfolio.positions.length === 0) return null

      const totalValue = portfolio.positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0)
      const totalInvested = portfolio.positions.reduce((sum, p) => sum + p.quantity * p.averagePrice, 0)
      const portfolioReturn = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0

      const moex = new MOEXProvider()
      const imoexCandles = await moex.getImoexCandles(fromStr, tillStr)
      if (imoexCandles.length < 2) return null

      const startPrice = imoexCandles[0].close
      const endPrice = imoexCandles[imoexCandles.length - 1].close
      const benchmarkReturn = ((endPrice - startPrice) / startPrice) * 100

      return {
        portfolioReturn: Math.round(portfolioReturn * 100) / 100,
        benchmarkReturn: Math.round(benchmarkReturn * 100) / 100,
        delta: Math.round((portfolioReturn - benchmarkReturn) * 100) / 100,
        period: days,
      }
    } catch {
      return null
    }
  }

  async getAggregateDividendYield(positions: PortfolioPosition[]): Promise<AggregateDividendYield> {
    const totalValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0)
    if (totalValue <= 0) return { weightedYield: 0, positionYields: [] }

    const moex = new MOEXProvider()
    const results = await Promise.all(
      positions.map(async (pos) => {
        const weight = (pos.quantity * pos.currentPrice) / totalValue
        try {
          const dividends = await moex.getDividends(pos.ticker)
          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
          const recent = dividends.filter(d => new Date(d.registryclosedate) >= oneYearAgo)
          if (recent.length === 0 || pos.currentPrice <= 0) {
            return { ticker: pos.ticker, weight, dividendYield: null as number | null }
          }
          const totalDiv = recent.reduce((sum, d) => sum + d.value, 0)
          const dy = (totalDiv / pos.currentPrice) * 100
          return { ticker: pos.ticker, weight, dividendYield: Math.round(dy * 100) / 100 }
        } catch {
          return { ticker: pos.ticker, weight, dividendYield: null as number | null }
        }
      })
    )

    let weightedYield = 0
    for (const r of results) {
      if (r.dividendYield !== null) weightedYield += r.weight * r.dividendYield
    }

    return { weightedYield: Math.round(weightedYield * 100) / 100, positionYields: results }
  }
}
