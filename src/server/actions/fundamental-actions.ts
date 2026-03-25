"use server"

import { FundamentalService } from "@/server/services/fundamental-service"
import { getCurrentUserId } from "./helpers"
import type { FundamentalMetrics } from "@/core/types"
import type { ApiResponse } from "@/core/types/api"
import { successResponse, errorResponse } from "@/core/types/api"

export const getFundamentalsAction = async (
  ticker: string,
  currentPrice: number,
): Promise<ApiResponse<FundamentalMetrics>> => {
  try {
    await getCurrentUserId()
    const service = new FundamentalService()
    const metrics = await service.getMetrics(ticker, currentPrice)
    return successResponse(metrics)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
