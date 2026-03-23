import { mean, standardDeviation, quantileSorted } from "simple-statistics"
import type { MetricName, MetricStatus } from "@/core/types"

const TRADING_DAYS = 248
const RF_DAILY = 0.21 / TRADING_DAYS

const dailyReturns = (closes: number[]): number[] => {
  if (closes.length < 2) return []
  return closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])
}

const sharpe = (returns: number[], rfDaily: number = RF_DAILY): number | null => {
  if (returns.length < 2) return null
  const excess = returns.map((r) => r - rfDaily)
  const std = standardDeviation(excess)
  if (std === 0) return 0
  return (mean(excess) / std) * Math.sqrt(TRADING_DAYS)
}

const maxDrawdown = (
  returns: number[]
): { value: number; peakIdx: number; troughIdx: number } | null => {
  if (returns.length < 1) return null
  const cumulative: number[] = []
  let cum = 1
  for (const r of returns) {
    cum *= 1 + r
    cumulative.push(cum)
  }
  let peak = cumulative[0]
  let peakIdx = 0
  let mdd = 0
  let mddPeakIdx = 0
  let mddTroughIdx = 0
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i] > peak) {
      peak = cumulative[i]
      peakIdx = i
    }
    const dd = (peak - cumulative[i]) / peak
    if (dd > mdd) {
      mdd = dd
      mddPeakIdx = peakIdx
      mddTroughIdx = i
    }
  }
  return { value: mdd * 100, peakIdx: mddPeakIdx, troughIdx: mddTroughIdx }
}

const var95 = (returns: number[]): number | null => {
  if (returns.length < 2) return null
  const sorted = [...returns].sort((a, b) => a - b)
  const q = quantileSorted(sorted, 0.05)
  return Math.abs(q) * 100
}

const beta = (portfolio: number[], benchmark: number[]): number | null => {
  if (portfolio.length !== benchmark.length) return null
  if (portfolio.length < 30) return null
  const bVar = standardDeviation(benchmark) ** 2
  if (bVar === 0) return null
  const pMean = mean(portfolio)
  const bMean = mean(benchmark)
  let cov = 0
  for (let i = 0; i < portfolio.length; i++) {
    cov += (portfolio[i] - pMean) * (benchmark[i] - bMean)
  }
  cov /= portfolio.length
  const bVariance = benchmark.reduce((s, v) => s + (v - bMean) ** 2, 0) / benchmark.length
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
  maxDrawdown,
  var95,
  beta,
  alpha,
  annualize,
  getMetricStatus,
  alignByDate,
  RF_DAILY,
  TRADING_DAYS,
}
