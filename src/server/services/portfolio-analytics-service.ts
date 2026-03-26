import { sampleCorrelation, sampleCovariance, mean } from "simple-statistics"
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
  MarkowitzResult,
  RebalancingAction,
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

      const moex = new MOEXProvider()
      const positions = portfolio.positions.filter(
        (p) => p.instrumentType === "STOCK" || p.instrumentType === "ETF"
      )
      if (positions.length === 0) return null

      const [imoexCandles, ...positionCandles] = await Promise.all([
        moex.getImoexCandles(fromStr, tillStr),
        ...positions.slice(0, 10).map((p) =>
          this.broker.getCandles(userId, { instrumentId: p.instrumentId, from, to: now, interval: "day" })
            .catch(() => [])
        ),
      ])

      if (imoexCandles.length < 2) return null

      let pastValue = 0
      let currentValue = 0
      for (let i = 0; i < Math.min(positions.length, 10); i++) {
        const pos = positions[i]
        const candles = positionCandles[i]
        const startClose = candles.length > 0 ? candles[0].close : pos.currentPrice
        pastValue += pos.quantity * startClose
        currentValue += pos.quantity * pos.currentPrice
      }

      const portfolioReturn = pastValue > 0 ? ((currentValue - pastValue) / pastValue) * 100 : 0

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
    const results: { ticker: string; weight: number; dividendYield: number | null }[] = []
    for (let i = 0; i < positions.length; i += 5) {
      const batch = positions.slice(i, i + 5)
      const batchResults = await Promise.all(
        batch.map(async (pos) => {
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
      results.push(...batchResults)
    }

    let weightedYield = 0
    for (const r of results) {
      if (r.dividendYield !== null) weightedYield += r.weight * r.dividendYield
    }

    return { weightedYield: Math.round(weightedYield * 100) / 100, positionYields: results }
  }

  async _buildReturnSeries(userId: string, positions: PortfolioPosition[], days: number): Promise<number[][]> {
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
    return returnsArr
  }

  async getMarkowitzOptimization(userId: string, days = 90): Promise<MarkowitzResult | null> {
    const portfolio = await this.broker.getPortfolio(userId)
    if (!portfolio) return null

    const positions = portfolio.positions.filter(
      (p) => p.instrumentType === "STOCK" || p.instrumentType === "ETF"
    )
    if (positions.length < 2) return null

    const returnsArr = await this._buildReturnSeries(userId, positions, days)
    const validReturns = returnsArr.filter((r) => r.length >= 20)
    if (validReturns.length < 2) return null

    const n = positions.length
    const validFlags = returnsArr.map((r) => r.length >= 20)
    const minLen = Math.min(...returnsArr.filter((r) => r.length >= 20).map((r) => r.length))
    const trimmed = returnsArr.map((r) => r.slice(0, minLen))

    const meanReturns = trimmed.map((r) => (r.length > 0 ? mean(r) * 252 : 0))
    const covMatrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (trimmed[i].length < 2 || trimmed[j].length < 2) return 0
        return sampleCovariance(trimmed[i], trimmed[j]) * 252
      })
    )

    const RF_RATE = 0.16
    let bestSharpe = -Infinity
    let bestWeights: number[] = Array(n).fill(1 / n)
    let bestReturn = 0
    let bestVol = 0

    for (let iter = 0; iter < 10000; iter++) {
      const raw = positions.map((_, idx) => (validFlags[idx] ? Math.random() : 0))
      const rawSum = raw.reduce((s, v) => s + v, 0)
      if (rawSum === 0) continue
      const w = raw.map((v) => v / rawSum)

      for (let pass = 0; pass < 10; pass++) {
        let capped = false
        for (let k = 0; k < n; k++) {
          if (w[k] > 0.4) {
            const excess = w[k] - 0.4
            w[k] = 0.4
            const others = w.reduce((s, v, idx) => s + (idx !== k && v < 0.4 ? v : 0), 0)
            if (others > 0) {
              for (let j = 0; j < n; j++) {
                if (j !== k && w[j] < 0.4) w[j] += (w[j] / others) * excess
              }
            }
            capped = true
          }
        }
        if (!capped) break
      }

      const wSum = w.reduce((s, v) => s + v, 0)
      for (let k = 0; k < n; k++) w[k] /= wSum
      if (w.some((v) => v > 0.4 + 1e-9)) continue

      let portReturn = 0
      for (let k = 0; k < n; k++) portReturn += w[k] * meanReturns[k]

      let portVar = 0
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          portVar += w[i] * w[j] * covMatrix[i][j]
        }
      }
      const portVol = Math.sqrt(Math.max(portVar, 0))
      if (portVol === 0) continue

      const sharpe = (portReturn - RF_RATE) / portVol
      if (sharpe > bestSharpe) {
        bestSharpe = sharpe
        bestWeights = [...w]
        bestReturn = portReturn
        bestVol = portVol
      }
    }

    const totalValue = positions.reduce((s, p) => s + p.quantity * p.currentPrice, 0)
    const weights = positions.map((p, i) => ({
      ticker: p.ticker,
      currentWeight: totalValue > 0 ? (p.quantity * p.currentPrice) / totalValue : 0,
      optimalWeight: bestWeights[i],
      currentValue: p.quantity * p.currentPrice,
    }))

    const [stockInstruments, etfInstruments] = await Promise.all([
      this.broker.getInstruments(userId, "STOCK"),
      this.broker.getInstruments(userId, "ETF"),
    ])
    const lotMap = new Map<string, number>()
    for (const inst of [...stockInstruments, ...etfInstruments]) {
      lotMap.set(inst.ticker, inst.lot)
    }

    const rebalancingActions: RebalancingAction[] = positions.map((p, i) => {
      const targetValue = bestWeights[i] * totalValue
      const currentVal = p.quantity * p.currentPrice
      const delta = targetValue - currentVal
      const lotSize = lotMap.get(p.ticker) ?? 1
      const lotsNeeded = Math.round(delta / (p.currentPrice * lotSize))
      const action: "BUY" | "SELL" | "HOLD" = lotsNeeded > 0 ? "BUY" : lotsNeeded < 0 ? "SELL" : "HOLD"
      return {
        ticker: p.ticker,
        action,
        lots: Math.abs(lotsNeeded),
        valueRub: Math.abs(lotsNeeded) * p.currentPrice * lotSize,
      }
    })

    return {
      weights,
      rebalancingActions,
      expectedReturn: Math.round(bestReturn * 10000) / 10000,
      expectedVolatility: Math.round(bestVol * 10000) / 10000,
      sharpe: Math.round(bestSharpe * 100) / 100,
      insufficientData: validReturns.length < positions.length,
    }
  }
}
