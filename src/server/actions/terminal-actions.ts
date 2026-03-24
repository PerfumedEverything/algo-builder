"use server"

import { TinkoffInvestApi } from "tinkoff-invest-api"
import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { OrderBookData, TopMover } from "@/core/types"
import type { PositionOperation } from "@/core/types"
import { mapOrderBookResponse } from "@/lib/order-book-utils"
import { MOEXProvider } from "@/server/providers/analytics"
import { BrokerService } from "@/server/services"
import { getCurrentUserId } from "./helpers"

type RawOrder = {
  price?: { units: number; nano: number }
  quantity?: number
}

export const getOrderBookAction = async (
  figi: string,
  depth = 10,
): Promise<ApiResponse<OrderBookData>> => {
  try {
    const api = new TinkoffInvestApi({ token: process.env.TINKOFF_SYSTEM_TOKEN! })
    const { bids, asks } = await api.marketdata.getOrderBook({ instrumentId: figi, depth })
    return successResponse(mapOrderBookResponse(bids as RawOrder[], asks as RawOrder[]))
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getTopMoversAction = async (
  topN = 5,
): Promise<ApiResponse<{ gainers: TopMover[]; losers: TopMover[] }>> => {
  try {
    const result = await new MOEXProvider().getTopMovers(topN)
    return successResponse(result)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getOperationsByTickerAction = async (
  ticker: string,
): Promise<ApiResponse<PositionOperation[]>> => {
  try {
    const userId = await getCurrentUserId()
    const portfolio = await new BrokerService().getPortfolio(userId)
    const position = portfolio?.positions.find((p) => p.ticker === ticker)
    return successResponse(position?.operations ?? [])
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
