import { mean, standardDeviation } from "simple-statistics"
import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateVaR,
  calculateMaxDrawdown,
} from "@railpath/finance-toolkit"
import type { MetricName, MetricStatus } from "@/core/types"

const TRADING_DAYS = 248
const RF_DAILY = 0.21 / TRADING_DAYS

const dailyReturns = (closes: number[]): number[] => {
  if (closes.length < 2) return []
  return closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])
}

const sharpe = (returns: number[], rfDaily: number = RF_DAILY): number | null => {
  if (returns.length < 2) return null
  const result = calculateSharpeRatio({ returns, riskFreeRate: rfDaily, annualizationFactor: TRADING_DAYS })
  const ratio = result.sharpeRatio
  if (!isFinite(ratio)) return 0
  return ratio
}

const sortino = (returns: number[], rfDaily: number = RF_DAILY): number | null => {
  if (returns.length < 2) return null
  const result = calculateSortinoRatio({ returns, riskFreeRate: rfDaily, annualizationFactor: TRADING_DAYS })
  const ratio = result.sortinoRatio
  if (!isFinite(ratio)) return 0
  return ratio
}

const maxDrawdown = (
  prices: number[]
): { value: number; peakIdx: number; troughIdx: number } | null => {
  if (prices.length < 2) return null
  const result = calculateMaxDrawdown({ prices })
  return { value: result.maxDrawdownPercent * 100, peakIdx: result.peakIndex, troughIdx: result.troughIndex }
}

const var95 = (returns: number[]): number | null => {
  if (returns.length < 2) return null
  const result = calculateVaR(returns, { confidenceLevel: 0.95 })
  return Math.abs(result.value) * 100
}

const beta = (portfolio: number[], benchmark: number[]): number | null => {
  if (portfolio.length !== benchmark.length) return null
  if (portfolio.length < 30) return null
  const pMean = mean(portfolio)
  const bMean = mean(benchmark)
  const n = portfolio.length
  let cov = 0
  let bVariance = 0
  for (let i = 0; i < n; i++) {
    const bDiff = benchmark[i] - bMean
    cov += (portfolio[i] - pMean) * bDiff
    bVariance += bDiff * bDiff
  }
  if (bVariance === 0) return null
  return cov / bVariance
}

const alpha = (
  portfolioAnnual: number,
  betaVal: number,
  benchmarkAnnual: number,
  rfAnnual: number
): number => {
  return portfolioAnnual - (rfAnnual + betaVal * (benchmarkAnnual - rfAnnual))
}

const annualize = (dailyRet: number[]): number => {
  if (dailyRet.length === 0) return 0
  return Math.pow(1 + mean(dailyRet), TRADING_DAYS) - 1
}

const thresholds: Record<MetricName, { green: (v: number) => boolean; red: (v: number) => boolean }> = {
  sharpe: { green: (v) => v >= 1.0, red: (v) => v < 0.5 },
  beta: { green: (v) => v >= 0.8 && v <= 1.2, red: (v) => v > 1.5 || v < 0.3 },
  var95: { green: (v) => v < 2, red: (v) => v > 5 },
  maxDrawdown: { green: (v) => v < 10, red: (v) => v > 20 },
  alpha: { green: (v) => v > 0, red: (v) => v < -0.02 },
}

const getMetricStatus = (metric: MetricName, value: number): MetricStatus => {
  const t = thresholds[metric]
  if (t.green(value)) return "green"
  if (t.red(value)) return "red"
  return "yellow"
}

const alignByDate = (
  a: Map<string, number>,
  b: Map<string, number>
): { aligned_a: number[]; aligned_b: number[] } => {
  const aligned_a: number[] = []
  const aligned_b: number[] = []
  const sortedKeys = [...a.keys()].filter((k) => b.has(k)).sort()
  for (const key of sortedKeys) {
    aligned_a.push(a.get(key)!)
    aligned_b.push(b.get(key)!)
  }
  return { aligned_a, aligned_b }
}

export {
  dailyReturns,
  sharpe,
  sortino,
  maxDrawdown,
  var95,
  beta,
  alpha,
  annualize,
  getMetricStatus,
  alignByDate,
  RF_DAILY,
}
