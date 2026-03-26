"use server"

import type {
  ApiResponse,
  MOEXCandle,
  DividendData,
  CorrelationMatrix,
  PortfolioAnalytics,
  HealthScore,
} from "@/core/types"
import { successResponse, errorResponse } from "@/core/types"
import { MOEXProvider } from "@/server/providers/analytics"
import { BrokerService } from "@/server/services/broker-service"
import { PortfolioAnalyticsService } from "@/server/services/portfolio-analytics-service"
import { PortfolioHealthService } from "@/server/services/portfolio-health-service"
import { getCurrentUserId } from "./helpers"
import { analyzeWithAiAction } from "./ai-analysis-actions"

const provider = new MOEXProvider()
const analyticsService = new PortfolioAnalyticsService()
const brokerService = new BrokerService()

export const getImoexCandlesAction = async (
  from: string,
  till: string,
): Promise<ApiResponse<MOEXCandle[]>> => {
  try {
    await getCurrentUserId()
    const candles = await provider.getImoexCandles(from, till)
    return successResponse(candles)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}

export const getDividendsAction = async (
  ticker: string,
): Promise<ApiResponse<DividendData[]>> => {
  try {
    await getCurrentUserId()
    const dividends = await provider.getDividends(ticker)
    return successResponse(dividends)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}

export const getCorrelationMatrixAction = async (days = 90): Promise<ApiResponse<CorrelationMatrix>> => {
  try {
    const userId = await getCurrentUserId()
    const matrix = await analyticsService.getCorrelationMatrix(userId, days)
    return successResponse(matrix)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}

export const getPortfolioAnalyticsAction = async (): Promise<ApiResponse<PortfolioAnalytics>> => {
  try {
    const userId = await getCurrentUserId()
    const portfolio = await brokerService.getPortfolio(userId)
    const positions = portfolio?.positions ?? []

    const results = await Promise.allSettled([
      Promise.resolve(analyticsService.getSectorAllocation(positions)),
      Promise.resolve(analyticsService.getAssetTypeBreakdown(positions)),
      analyticsService.getTradeSuccessBreakdown(userId),
      analyticsService.getBenchmarkComparison(userId),
      analyticsService.getAggregateDividendYield(positions),
    ])

    const sectorAllocation = results[0].status === "fulfilled" ? results[0].value : []
    const assetTypeBreakdown = results[1].status === "fulfilled" ? results[1].value : []
    const tradeSuccessBreakdown = results[2].status === "fulfilled"
      ? results[2].value
      : { profitable: { count: 0, totalPnl: 0 }, unprofitable: { count: 0, totalPnl: 0 }, breakEven: { count: 0 }, byInstrument: [] }
    const benchmarkComparison = results[3].status === "fulfilled" ? results[3].value : null
    const aggregateDividendYield = results[4].status === "fulfilled"
      ? results[4].value
      : { weightedYield: 0, positionYields: [] }

    const concentration = analyticsService.getConcentrationIndex(positions)

    return successResponse({
      sectorAllocation,
      assetTypeBreakdown,
      tradeSuccessBreakdown,
      concentration,
      benchmarkComparison,
      aggregateDividendYield,
    })
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}

export const getHealthScoreAction = async (): Promise<ApiResponse<HealthScore>> => {
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

    return successResponse(healthScore)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}

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
