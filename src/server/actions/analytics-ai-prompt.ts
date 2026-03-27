"use server"

import type { ApiResponse } from "@/core/types"
import { errorResponse } from "@/core/types"
import { BrokerService } from "@/server/services/broker-service"
import { PortfolioHealthService } from "@/server/services/portfolio-health-service"
import { getCurrentUserId } from "./helpers"
import { analyzeWithAiAction } from "./ai-analysis-actions"
import { getPortfolioAnalyticsAction, getCorrelationMatrixAction } from "./analytics-actions"

const brokerService = new BrokerService()

export const getFullPortfolioAiAnalysisAction = async (): Promise<ApiResponse<string>> => {
  try {
    const userId = await getCurrentUserId()
    const portfolio = await brokerService.getPortfolio(userId)
    const positions = portfolio?.positions ?? []

    const [analyticsRes, corrRes] = await Promise.allSettled([
      getPortfolioAnalyticsAction(),
      getCorrelationMatrixAction(),
    ])

    const analytics = analyticsRes.status === "fulfilled" && analyticsRes.value.success
      ? analyticsRes.value.data
      : null
    const correlation = corrRes.status === "fulfilled" && corrRes.value.success
      ? corrRes.value.data
      : null

    const healthScore = PortfolioHealthService.computeHealthScore({
      concentration: analytics?.concentration ?? { hhi: 0, level: "diversified", dominantPositions: [] },
      sectorAllocation: analytics?.sectorAllocation ?? [],
      benchmark: analytics?.benchmarkComparison ?? null,
      highCorrelationCount: correlation?.highPairs?.length ?? 0,
      positionCount: positions.length,
    })

    const advice = analytics
      ? PortfolioHealthService.generateDiversificationAdvice(
          positions,
          analytics.concentration,
          analytics.sectorAllocation,
        )
      : []

    const warnings = correlation
      ? PortfolioHealthService.generateCorrelationWarnings(correlation.highPairs)
      : []

    const enhanced = analytics?.benchmarkComparison
      ? PortfolioHealthService.enhanceBenchmark(analytics.benchmarkComparison)
      : null

    const lines: string[] = []
    lines.push(`Портфель: ${positions.length} позиций`)

    lines.push(`\nВсе позиции:`)
    const totalValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0)
    for (const p of positions) {
      const weight = totalValue > 0 ? ((p.quantity * p.currentPrice) / totalValue * 100).toFixed(1) : "0"
      lines.push(`  ${p.ticker} (${p.name}): ${p.quantity} шт., цена ${p.currentPrice}₽, доходность ${p.expectedYield.toFixed(1)}%, вес ${weight}%`)
    }

    lines.push(`\nЗдоровье портфеля: ${healthScore.total}/100 (${healthScore.level})`)
    lines.push(`  Диверсификация: ${healthScore.diversification.score}/100`)
    for (const d of healthScore.diversification.details) lines.push(`    - ${d}`)
    lines.push(`  Риск: ${healthScore.risk.score}/100`)
    for (const d of healthScore.risk.details) lines.push(`    - ${d}`)
    lines.push(`  Доходность: ${healthScore.performance.score}/100`)
    for (const d of healthScore.performance.details) lines.push(`    - ${d}`)

    if (advice.length > 0) {
      lines.push(`\nРекомендации по диверсификации:`)
      for (const a of advice) lines.push(`  [${a.level}] ${a.text}`)
    }

    if (enhanced) {
      lines.push(`\nСравнение с бенчмарком: ${enhanced.verdictText}`)
      lines.push(`  Портфель: ${enhanced.portfolioReturn.toFixed(1)}%, IMOEX: ${enhanced.benchmarkReturn.toFixed(1)}%, Депозит: ${(enhanced.depositRateForPeriod * 100).toFixed(1)}%`)
    }

    if (warnings.length > 0) {
      lines.push(`\nКорреляционные предупреждения:`)
      for (const w of warnings) lines.push(`  ${w.tickers[0]}-${w.tickers[1]} (${w.corr.toFixed(2)}): ${w.text}`)
    }

    if (analytics?.sectorAllocation && analytics.sectorAllocation.length > 0) {
      lines.push(`\nСекторы:`)
      for (const s of analytics.sectorAllocation) {
        lines.push(`  ${s.sector}: ${s.percent.toFixed(1)}% (${s.tickers.join(", ")})`)
      }
    }

    if (analytics?.aggregateDividendYield) {
      lines.push(`\nДивидендная доходность (взвеш.): ${analytics.aggregateDividendYield.weightedYield}%`)
    }

    const message = lines.join("\n")
    return analyzeWithAiAction("fullPortfolio", message)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}
