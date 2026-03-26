import {
  DEPOSIT_RATE_ANNUAL,
  HEALTH_WEIGHTS,
  SECTOR_LABELS,
  MAJOR_SECTORS,
} from "@/core/config/analytics-constants"
import { FUNDAMENTALS_MAP } from "@/core/data/fundamentals-map"
import type {
  HealthScore,
  HealthScoreLevel,
  HealthSubScore,
  DiversificationAdvice,
  CorrelationWarning,
  EnhancedBenchmarkComparison,
  BenchmarkComparison,
  BenchmarkVerdict,
  ConcentrationIndex,
  SectorAllocation,
  CorrelationMatrix,
  PortfolioPosition,
} from "@/core/types"

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export class PortfolioHealthService {
  static computeDiversificationScore(
    concentration: ConcentrationIndex,
    sectorAllocation: SectorAllocation[],
  ): HealthSubScore {
    const details: string[] = []

    let score = concentration.hhi < 0.10 ? 100
      : concentration.hhi < 0.15 ? 80
      : concentration.hhi < 0.25 ? 50
      : 20
    details.push(`HHI ${(concentration.hhi * 100).toFixed(0)}% — ${
      score >= 80 ? "хорошая диверсификация" : score >= 50 ? "умеренная концентрация" : "высокая концентрация"
    }`)

    const sectorCount = sectorAllocation.filter(s => s.percent > 0).length
    if (sectorCount >= 6) {
      score += 20
      details.push(`${sectorCount} секторов — отличное распределение`)
    } else if (sectorCount >= 4) {
      score += 10
      details.push(`${sectorCount} секторов — хорошее распределение`)
    } else {
      details.push(`Всего ${sectorCount} ${sectorCount === 1 ? "сектор" : "сектора"} — мало`)
    }

    if (concentration.dominantPositions.length > 0) {
      score -= 30
      const names = concentration.dominantPositions.map(p => `${p.ticker} ${(p.weight * 100).toFixed(0)}%`).join(", ")
      details.push(`Доминирующие позиции: ${names}`)
    }

    return { score: clamp(score, 0, 100), details }
  }

  static computeRiskScore(highCorrelationCount: number): HealthSubScore {
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

  static computePerformanceScore(
    benchmark: BenchmarkComparison | null,
    depositRate: number,
  ): HealthSubScore {
    if (!benchmark) {
      return { score: 50, details: ["Нет данных для сравнения"] }
    }

    const details: string[] = []
    const depositRateForPeriod = depositRate * (benchmark.period / 365)
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

  static computeHealthScore(params: {
    concentration: ConcentrationIndex
    sectorAllocation: SectorAllocation[]
    benchmark: BenchmarkComparison | null
    highCorrelationCount: number
    positionCount: number
  }): HealthScore {
    if (params.positionCount < 2) {
      return {
        total: 0,
        level: "insufficient_data" as HealthScoreLevel,
        diversification: { score: 0, details: ["Недостаточно позиций для анализа"] },
        risk: { score: 0, details: ["Недостаточно позиций для анализа"] },
        performance: { score: 0, details: ["Недостаточно позиций для анализа"] },
      }
    }

    const diversification = this.computeDiversificationScore(params.concentration, params.sectorAllocation)
    const risk = this.computeRiskScore(params.highCorrelationCount)
    const performance = this.computePerformanceScore(params.benchmark, DEPOSIT_RATE_ANNUAL)

    const total = Math.round(
      diversification.score * HEALTH_WEIGHTS.diversification +
      risk.score * HEALTH_WEIGHTS.risk +
      performance.score * HEALTH_WEIGHTS.performance
    )

    const level: HealthScoreLevel = total >= 75 ? "excellent"
      : total >= 50 ? "good"
      : total >= 25 ? "warning"
      : "danger"

    return { total, level, diversification, risk, performance }
  }

  static generateDiversificationAdvice(
    positions: PortfolioPosition[],
    concentration: ConcentrationIndex,
    sectorAllocation: SectorAllocation[],
  ): DiversificationAdvice[] {
    const advice: DiversificationAdvice[] = []
    const totalValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0)

    if (totalValue > 0) {
      for (const pos of positions) {
        const weight = (pos.quantity * pos.currentPrice) / totalValue
        if (weight > 0.30) {
          advice.push({
            level: "danger",
            icon: "x-circle",
            text: `${pos.ticker} занимает ${(weight * 100).toFixed(0)}% портфеля — рекомендуется не более 25%`,
          })
        }
      }
    }

    for (const sector of sectorAllocation) {
      if (sector.percent > 50) {
        const label = SECTOR_LABELS[sector.sector] ?? sector.sector
        advice.push({
          level: "warning",
          icon: "alert-triangle",
          text: `Сектор "${label}" занимает ${sector.percent.toFixed(0)}% — высокая концентрация`,
        })
      }
    }

    const activeSectors = sectorAllocation.filter(s => s.percent > 0).map(s => s.sector)
    if (activeSectors.length < 3) {
      advice.push({
        level: "warning",
        icon: "alert-triangle",
        text: `Всего ${activeSectors.length} ${activeSectors.length === 1 ? "сектор" : "сектора"} в портфеле — добавьте акции из других секторов`,
      })
    }

    const missingSectors = MAJOR_SECTORS.filter(s => !activeSectors.includes(s))
    for (const missing of missingSectors) {
      const label = SECTOR_LABELS[missing] ?? missing
      advice.push({
        level: "warning",
        icon: "alert-triangle",
        text: `Нет позиций в секторе "${label}" — рассмотрите для диверсификации`,
      })
    }

    if (concentration.hhi > 0.25) {
      advice.push({
        level: "warning",
        icon: "alert-triangle",
        text: "Высокий индекс концентрации (HHI) — портфель сильно зависит от нескольких позиций",
      })
    }

    if (advice.length === 0) {
      advice.push({
        level: "success",
        icon: "check",
        text: "Хорошая диверсификация",
      })
    }

    return advice
  }

  static generateCorrelationWarnings(
    highPairs: CorrelationMatrix["highPairs"],
  ): CorrelationWarning[] {
    if (highPairs.length === 0) return []

    return highPairs.map(pair => {
      const sectorA = FUNDAMENTALS_MAP[pair.a]?.sector
      const sectorB = FUNDAMENTALS_MAP[pair.b]?.sector
      const sameSector = sectorA && sectorB && sectorA === sectorB
      const isPositive = pair.corr > 0

      let text: string
      if (isPositive) {
        const sectorNote = sameSector
          ? ` (оба ${SECTOR_LABELS[sectorA] ?? sectorA})`
          : ""
        text = `${pair.a} и ${pair.b} движутся вместе${sectorNote} — это увеличивает риск`
      } else {
        text = `${pair.a} и ${pair.b} движутся противоположно — это хорошо для диверсификации`
      }

      return {
        tickers: [pair.a, pair.b] as [string, string],
        corr: pair.corr,
        text,
        isPositive,
      }
    })
  }

  static enhanceBenchmark(benchmark: BenchmarkComparison): EnhancedBenchmarkComparison {
    const depositRateForPeriod = DEPOSIT_RATE_ANNUAL * (benchmark.period / 365)
    const depositPct = depositRateForPeriod * 100
    const depositDelta = benchmark.portfolioReturn - depositPct

    let verdict: BenchmarkVerdict
    let verdictText: string

    if (benchmark.portfolioReturn > benchmark.benchmarkReturn && benchmark.portfolioReturn > depositPct) {
      verdict = "beats_market"
      verdictText = `Вы обгоняете рынок на ${benchmark.delta.toFixed(1)}%`
    } else if (benchmark.portfolioReturn > depositPct) {
      verdict = "beats_deposit"
      verdictText = "Лучше депозита, но рынок обгоняет вас"
    } else {
      verdict = "loses_to_deposit"
      const diff = Math.abs(depositDelta)
      verdictText = `Депозит выгоднее на ${diff.toFixed(1)}%`
    }

    return {
      ...benchmark,
      depositRateForPeriod,
      depositDelta,
      verdict,
      verdictText,
    }
  }
}
