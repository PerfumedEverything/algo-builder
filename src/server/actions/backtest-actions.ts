"use server"

import { getCurrentUserId } from "./helpers"
import { BacktestService } from "@/server/services"
import type { BacktestParams, BacktestResult } from "@/server/services"
import { successResponse, errorResponse } from "@/core/types/api"
import type { ApiResponse } from "@/core/types/api"

export const runBacktestAction = async (
  strategyId: string,
  params: Omit<BacktestParams, "entryConditions" | "exitConditions">,
): Promise<ApiResponse<BacktestResult>> => {
  try {
    await getCurrentUserId()

    const result = await BacktestService.runBacktest({
      ...params,
      entryConditions: "",
      exitConditions: "",
    })

    return successResponse(result)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Backtest failed")
  }
}
