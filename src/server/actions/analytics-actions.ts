"use server"

import type { ApiResponse, MOEXCandle, DividendData } from "@/core/types"
import { successResponse, errorResponse } from "@/core/types"
import { MOEXProvider } from "@/server/providers/analytics"
import { getCurrentUserId } from "./helpers"

const provider = new MOEXProvider()

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
