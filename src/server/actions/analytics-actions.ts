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

const provider = new MOEXProvider()
const analyticsService = new PortfolioAnalyticsService()
const brokerService = new BrokerService()

export { getFullPortfolioAiAnalysisAction } from "./analytics-ai-prompt"

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
