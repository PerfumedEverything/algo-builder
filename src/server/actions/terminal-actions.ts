"use server"

import { TinkoffInvestApi } from "tinkoff-invest-api"
import { RestClientV5 } from "bybit-api"
import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { OrderBookData, TopMover } from "@/core/types"
import type { PositionOperation } from "@/core/types"
import { mapOrderBookResponse } from "@/lib/order-book-utils"
import { redis } from "@/lib/redis"
import { MOEXProvider } from "@/server/providers/analytics"
import { BrokerService } from "@/server/services"
import { BrokerRepository } from "@/server/repositories"
import { getCurrentUserId } from "./helpers"

type RawOrder = {
  price?: { units: number; nano: number }
  quantity?: number
}

const getOrderBookTinkoff = async (figi: string, depth: number): Promise<OrderBookData> => {
  const api = new TinkoffInvestApi({ token: process.env.TINKOFF_SYSTEM_TOKEN! })
  const { bids, asks } = await api.marketdata.getOrderBook({ instrumentId: figi, depth })
  return mapOrderBookResponse(bids as RawOrder[], asks as RawOrder[])
}

const getOrderBookBybit = async (symbol: string, depth: number, apiKey: string, apiSecret: string): Promise<OrderBookData> => {
  const client = new RestClientV5({ key: apiKey, secret: apiSecret, testnet: true })
  const res = await client.getOrderbook({ category: "linear", symbol, limit: depth })
  const bids = res.result.b.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) }))
  const asks = res.result.a.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) }))
  const spread = asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0
  return { bids, asks, spread }
}

export const getOrderBookAction = async (
  instrumentId: string,
  depth = 10,
): Promise<ApiResponse<OrderBookData>> => {
  try {
    const userId = await getCurrentUserId()
    const repo = new BrokerRepository()
    const settings = await repo.getSettings(userId)
    const brokerType = settings?.brokerType ?? "TINKOFF"

    if (brokerType === "BYBIT") {
      if (!settings?.bybitApiKey || !settings?.bybitApiSecret) {
        return errorResponse("Bybit credentials not configured")
      }
      const data = await getOrderBookBybit(instrumentId, depth, settings.bybitApiKey, settings.bybitApiSecret)
      return successResponse(data)
    }

    const data = await getOrderBookTinkoff(instrumentId, depth)
    return successResponse(data)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getTopMoversAction = async (
  topN = 5,
): Promise<ApiResponse<{ gainers: TopMover[]; losers: TopMover[] }>> => {
  try {
    await getCurrentUserId()
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

export const subscribeInstrumentAction = async (
  ticker: string,
): Promise<ApiResponse<void>> => {
  try {
    await getCurrentUserId()
    const cleanTicker = ticker.replace(/@$/, "").toUpperCase()
    await redis.sadd("requested-instruments", cleanTicker)
    await redis.expire("requested-instruments", 300)
    return successResponse(undefined)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
