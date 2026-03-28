import {
  DEPOSIT_RATE_ANNUAL,
  HEALTH_WEIGHTS,
} from "@/core/config/analytics-constants"
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
import {
  scoreDiversification,
  scoreRisk,
  scorePerformance,
  buildDiversificationAdvice,
  buildCorrelationWarnings,
} from "./health-scoring-constants"

export class PortfolioHealthService {
  static computeDiversificationScore(
    concentration: ConcentrationIndex,
    sectorAllocation: SectorAllocation[],
  ): HealthSubScore {
    return scoreDiversification(concentration, sectorAllocation)
  }

  static computeRiskScore(highCorrelationCount: number): HealthSubScore {
    return scoreRisk(highCorrelationCount)
  }

  static computePerformanceScore(
    benchmark: BenchmarkComparison | null,
    _depositRate: number,
  ): HealthSubScore {
    return scorePerformance(benchmark)
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

    const diversification = scoreDiversification(params.concentration, params.sectorAllocation)
    const risk = scoreRisk(params.highCorrelationCount)
    const performance = scorePerformance(params.benchmark)

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
    return buildDiversificationAdvice(positions, concentration, sectorAllocation)
  }

  static generateCorrelationWarnings(
    highPairs: CorrelationMatrix["highPairs"],
  ): CorrelationWarning[] {
    return buildCorrelationWarnings(highPairs)
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
      verdictText = `Депозит выгоднее на ${Math.abs(depositDelta).toFixed(1)}%`
    }

    return { ...benchmark, depositRateForPeriod, depositDelta, verdict, verdictText }
  }
}
