"use server"

import type { ApiResponse, MOEXCandle, DividendData, CorrelationMatrix, PortfolioAnalytics, MarkowitzResult } from "@/core/types"
import { successResponse, errorResponse } from "@/core/types"
import { MOEXProvider } from "@/server/providers/analytics"
import { BrokerService } from "@/server/services/broker-service"
import { PortfolioAnalyticsService } from "@/server/services/portfolio-analytics-service"
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

    const [sectorAllocation, assetTypeBreakdown, tradeSuccessBreakdown, benchmarkComparison, aggregateDividendYield] = await Promise.all([
      Promise.resolve(analyticsService.getSectorAllocation(positions)),
      Promise.resolve(analyticsService.getAssetTypeBreakdown(positions)),
      analyticsService.getTradeSuccessBreakdown(userId),
      analyticsService.getBenchmarkComparison(userId),
      analyticsService.getAggregateDividendYield(positions),
    ])

    const concentration = analyticsService.getConcentrationIndex(positions)

    return successResponse({ sectorAllocation, assetTypeBreakdown, tradeSuccessBreakdown, concentration, benchmarkComparison, aggregateDividendYield })
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}

export const getMarkowitzOptimizationAction = async (): Promise<ApiResponse<MarkowitzResult | null>> => {
  try {
    const userId = await getCurrentUserId()
    const result = await analyticsService.getMarkowitzOptimization(userId)
    return successResponse(result)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}

export const getFullPortfolioAiAnalysisAction = async (): Promise<ApiResponse<string>> => {
  try {
    const userId = await getCurrentUserId()
    const portfolio = await brokerService.getPortfolio(userId)
    const positions = portfolio?.positions ?? []

    const [analytics, correlation, optimization] = await Promise.all([
      getPortfolioAnalyticsAction(),
      getCorrelationMatrixAction(),
      getMarkowitzOptimizationAction(),
    ])

    const lines: string[] = []
    lines.push(`Портфель: ${positions.length} позиций`)

    if (analytics.success && analytics.data) {
      const sectors = analytics.data.sectorAllocation.slice(0, 5)
      lines.push(`\nСекторы: ${sectors.map(s => `${s.sector} ${s.percent.toFixed(1)}%`).join(", ")}`)
      const conc = analytics.data.concentration
      lines.push(`Концентрация (HHI): ${conc.hhi.toFixed(4)} — ${conc.level}`)
      if (analytics.data.benchmarkComparison) {
        const b = analytics.data.benchmarkComparison
        lines.push(`Доходность портфеля: ${b.portfolioReturn}%, IMOEX: ${b.benchmarkReturn}%, дельта: ${b.delta}%`)
      }
      lines.push(`Дивидендная доходность (взвеш.): ${analytics.data.aggregateDividendYield.weightedYield}%`)
    }

    if (correlation.success && correlation.data && correlation.data.highPairs.length > 0) {
      lines.push(`\nВысокие корреляции (>0.7):`)
      for (const p of correlation.data.highPairs.slice(0, 10)) {
        lines.push(`  ${p.a} — ${p.b}: ${p.corr}`)
      }
    }

    if (optimization.success && optimization.data) {
      const opt = optimization.data
      lines.push(`\nОптимизация Марковица:`)
      lines.push(`| Тикер | Текущий вес | Оптимальный вес |`)
      lines.push(`|-------|-------------|-----------------|`)
      for (const w of opt.weights) {
        lines.push(`| ${w.ticker} | ${(w.currentWeight * 100).toFixed(1)}% | ${(w.optimalWeight * 100).toFixed(1)}% |`)
      }
      lines.push(`Ожидаемая доходность: ${(opt.expectedReturn * 100).toFixed(1)}%`)
      lines.push(`Волатильность: ${(opt.expectedVolatility * 100).toFixed(1)}%`)
      lines.push(`Sharpe: ${opt.sharpe.toFixed(2)}`)

      const nonHold = opt.rebalancingActions.filter(a => a.action !== "HOLD")
      if (nonHold.length > 0) {
        lines.push(`\nРебалансировка:`)
        for (const a of nonHold) {
          lines.push(`  ${a.action} ${a.ticker}: ${a.lots} лотов (~${Math.round(a.valueRub)}₽)`)
        }
      }
    }

    const top5 = positions.slice(0, 5)
    if (top5.length > 0) {
      lines.push(`\nТоп-5 позиций:`)
      for (const p of top5) {
        lines.push(`  ${p.ticker} (${p.name}): ${p.quantity} шт., цена ${p.currentPrice}₽, доходность ${p.expectedYield.toFixed(1)}%`)
      }
    }

    const message = lines.join("\n")
    return analyzeWithAiAction("fullPortfolio", message)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}
