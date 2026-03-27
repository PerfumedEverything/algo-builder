"use server"

import type { ApiResponse } from "@/core/types/api"
import { errorResponse, successResponse } from "@/core/types/api"
import { BrokerService } from "@/server/services"
import { MSK_OFFSET_MS } from "@/server/services/candle-normalizer"
import { aggregateSessionStats, type DailySessionStats } from "@/server/services/session-stats"
import { getCurrentUserId } from "./helpers"

export type ChartCandle = {
  time: string | number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export const getDailySessionStatsAction = async (
  figi: string,
): Promise<ApiResponse<DailySessionStats>> => {
  try {
    const userId = await getCurrentUserId()
    const service = new BrokerService()
    const today = new Date()
    const sessionStartUtc = new Date(today)
    sessionStartUtc.setUTCHours(
      10 - MSK_OFFSET_MS / (60 * 60 * 1000),
      0,
      0,
      0,
    )
    const candles = await service.getCandles(userId, {
      instrumentId: figi,
      interval: "1m",
      from: sessionStartUtc,
      to: today,
    })

    if (!candles || candles.length === 0) {
      return successResponse({ sessionOpen: 0, high: 0, low: 0, volume: 0 })
    }

    const stats = aggregateSessionStats(candles)
    return successResponse(stats)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export type ChartMarker = {
  time: string
  position: "belowBar" | "aboveBar"
  color: string
  shape: "arrowUp" | "arrowDown"
  text: string
}

const INTRADAY_INTERVALS = new Set(["1m", "5m", "15m", "1h"])

const formatCandleTime = (date: Date, interval: string): string | number => {
  if (INTRADAY_INTERVALS.has(interval)) {
    return Math.floor(date.getTime() / 1000)
  }
  return date.toISOString().split("T")[0]
}

export const getCandlesForChartAction = async (
  figi: string,
  interval: string,
  from: string,
  to: string,
): Promise<ApiResponse<ChartCandle[]>> => {
  try {
    const userId = await getCurrentUserId()
    const service = new BrokerService()
    const candles = await service.getCandles(userId, {
      instrumentId: figi,
      interval,
      from: new Date(from),
      to: new Date(to),
    })

    const chartCandles: ChartCandle[] = candles.map((c) => ({
      time: formatCandleTime(c.time, interval),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }))

    return successResponse(chartCandles)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getTradeMarkersAction = async (
  figi: string,
  operations: Array<{ type: string; date: string; quantity: number; price: number }>,
): Promise<ApiResponse<ChartMarker[]>> => {
  try {
    await getCurrentUserId()

    const markers: ChartMarker[] = operations.map((op) => ({
      time: op.date.split("T")[0],
      position: op.type === "BUY" ? "belowBar" as const : "aboveBar" as const,
      color: op.type === "BUY" ? "#10b981" : "#ef4444",
      shape: op.type === "BUY" ? "arrowUp" as const : "arrowDown" as const,
      text: `${op.type === "BUY" ? "Buy" : "Sell"} ${op.quantity}`,
    }))

    markers.sort((a, b) => a.time.localeCompare(b.time))

    return successResponse(markers)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
