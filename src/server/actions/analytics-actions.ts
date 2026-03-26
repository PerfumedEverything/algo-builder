"use server"

import type { ApiResponse, MOEXCandle, DividendData, CorrelationMatrix, PortfolioAnalytics } from "@/core/types"
import { successResponse, errorResponse } from "@/core/types"
import { MOEXProvider } from "@/server/providers/analytics"
import { BrokerService } from "@/server/services/broker-service"
import { PortfolioAnalyticsService } from "@/server/services/portfolio-analytics-service"
import { getCurrentUserId } from "./helpers"

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

export const getCorrelationMatrixAction = async (): Promise<ApiResponse<CorrelationMatrix>> => {
  try {
    const userId = await getCurrentUserId()
    const matrix = await analyticsService.getCorrelationMatrix(userId)
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

    const [sectorAllocation, assetTypeBreakdown, tradeSuccessBreakdown] = await Promise.all([
      Promise.resolve(analyticsService.getSectorAllocation(positions)),
      Promise.resolve(analyticsService.getAssetTypeBreakdown(positions)),
      analyticsService.getTradeSuccessBreakdown(userId),
    ])

    return successResponse({ sectorAllocation, assetTypeBreakdown, tradeSuccessBreakdown })
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}
