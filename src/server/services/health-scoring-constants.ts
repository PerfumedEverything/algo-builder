import {
  DEPOSIT_RATE_ANNUAL,
  SECTOR_LABELS,
  MAJOR_SECTORS,
} from "@/core/config/analytics-constants"
import { FUNDAMENTALS_MAP } from "@/core/data/fundamentals-map"
import type {
  HealthSubScore,
  ConcentrationIndex,
  SectorAllocation,
  BenchmarkComparison,
  DiversificationAdvice,
  PortfolioPosition,
  CorrelationWarning,
  CorrelationMatrix,
} from "@/core/types"

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export const scoreDiversification = (
  concentration: ConcentrationIndex,
  sectorAllocation: SectorAllocation[],
): HealthSubScore => {
  const details: string[] = []

  let score = concentration.hhi < 0.10 ? 100
    : concentration.hhi < 0.15 ? 80
    : concentration.hhi < 0.25 ? 50
    : 20
  details.push(`HHI ${(concentration.hhi * 100).toFixed(0)}% — ${
    score >= 80 ? "хорошая диверсификация" : score >= 50 ? "умеренная концентрация" : "высокая концентрация"
  }`)

  const sectorCount = sectorAllocation.filter(s => s.percent > 0).length
  if (sectorCount >= 6) { score += 20; details.push(`${sectorCount} секторов — отличное распределение`) }
  else if (sectorCount >= 4) { score += 10; details.push(`${sectorCount} секторов — хорошее распределение`) }
  else details.push(`Всего ${sectorCount} ${sectorCount === 1 ? "сектор" : "сектора"} — мало`)

  if (concentration.dominantPositions.length > 0) {
    score -= 30
    const names = concentration.dominantPositions.map(p => `${p.ticker} ${(p.weight * 100).toFixed(0)}%`).join(", ")
    details.push(`Доминирующие позиции: ${names}`)
  }

  return { score: clamp(score, 0, 100), details }
}

export const scoreRisk = (highCorrelationCount: number): HealthSubScore => {
  const details: string[] = []
  const penalty = Math.min(highCorrelationCount * 5, 25)
  const score = clamp(80 - penalty, 0, 100)

  if (highCorrelationCount === 0) {
    details.push("Нет высококоррелированных пар — хороший уровень риска")
  } else {
    details.push(`${highCorrelationCount} высококоррелированных ${highCorrelationCount === 1 ? "пара" : "пар"} — повышает риск`)
  }

  return { score, details }
}

export const scorePerformance = (
  benchmark: BenchmarkComparison | null,
): HealthSubScore => {
  if (!benchmark) return { score: 50, details: ["Нет данных для сравнения"] }

  const details: string[] = []
  const depositRateForPeriod = DEPOSIT_RATE_ANNUAL * (benchmark.period / 365)
  const depositPct = depositRateForPeriod * 100
  const delta = benchmark.portfolioReturn - benchmark.benchmarkReturn

  let score = delta > 5 ? 100 : delta > 0 ? 80 : delta > -5 ? 50 : 20
  details.push(`Разница с индексом: ${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`)

  if (benchmark.portfolioReturn < depositPct) {
    score -= 20
    details.push(`Доходность ${benchmark.portfolioReturn.toFixed(1)}% ниже депозита ${depositPct.toFixed(1)}%`)
  }

  return { score: clamp(score, 0, 100), details }
}

export const buildDiversificationAdvice = (
  positions: PortfolioPosition[],
  concentration: ConcentrationIndex,
  sectorAllocation: SectorAllocation[],
): DiversificationAdvice[] => {
  const advice: DiversificationAdvice[] = []
  const totalValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0)

  if (totalValue > 0) {
    for (const pos of positions) {
      const weight = (pos.quantity * pos.currentPrice) / totalValue
      if (weight > 0.30) {
        advice.push({ level: "danger", icon: "x-circle", text: `${pos.ticker} занимает ${(weight * 100).toFixed(0)}% портфеля — рекомендуется не более 25%` })
      }
    }
  }

  for (const sector of sectorAllocation) {
    if (sector.percent > 50) {
      const label = SECTOR_LABELS[sector.sector] ?? sector.sector
      advice.push({ level: "warning", icon: "alert-triangle", text: `Сектор "${label}" занимает ${sector.percent.toFixed(0)}% — высокая концентрация` })
    }
  }

  const activeSectors = sectorAllocation.filter(s => s.percent > 0).map(s => s.sector)
  if (activeSectors.length < 3) {
    advice.push({ level: "warning", icon: "alert-triangle", text: `Всего ${activeSectors.length} ${activeSectors.length === 1 ? "сектор" : "сектора"} в портфеле — добавьте акции из других секторов` })
  }

  for (const missing of MAJOR_SECTORS.filter(s => !activeSectors.includes(s))) {
    const label = SECTOR_LABELS[missing] ?? missing
    advice.push({ level: "warning", icon: "alert-triangle", text: `Нет позиций в секторе "${label}" — рассмотрите для диверсификации` })
  }

  if (concentration.hhi > 0.25) {
    advice.push({ level: "warning", icon: "alert-triangle", text: "Высокий индекс концентрации (HHI) — портфель сильно зависит от нескольких позиций" })
  }

  if (advice.length === 0) advice.push({ level: "success", icon: "check", text: "Хорошая диверсификация" })

  return advice
}

export const buildCorrelationWarnings = (
  highPairs: CorrelationMatrix["highPairs"],
): CorrelationWarning[] => {
  if (highPairs.length === 0) return []

  return highPairs.map(pair => {
    const sectorA = FUNDAMENTALS_MAP[pair.a]?.sector
    const sectorB = FUNDAMENTALS_MAP[pair.b]?.sector
    const sameSector = sectorA && sectorB && sectorA === sectorB
    const isPositive = pair.corr > 0

    const text = isPositive
      ? `${pair.a} и ${pair.b} движутся вместе${sameSector ? ` (оба ${SECTOR_LABELS[sectorA] ?? sectorA})` : ""} — это увеличивает риск`
      : `${pair.a} и ${pair.b} движутся противоположно — это хорошо для диверсификации`

    return { tickers: [pair.a, pair.b] as [string, string], corr: pair.corr, text, isPositive }
  })
}
