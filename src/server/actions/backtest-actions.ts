"use server"

import { getCurrentUserId } from "./helpers"
import { BacktestService } from "@/server/services"
import type { BacktestResult } from "@/server/services"
import { StrategyRepository } from "@/server/repositories/strategy-repository"
import { successResponse, errorResponse } from "@/core/types/api"
import type { ApiResponse } from "@/core/types/api"

type RunBacktestInput = {
  fromDate: Date
  toDate: Date
  positionSize?: number
  instrumentId?: string
  interval?: string
}

export const runBacktestAction = async (
  strategyId: string,
  input: RunBacktestInput,
): Promise<ApiResponse<BacktestResult>> => {
  try {
    const userId = await getCurrentUserId()
    const repo = new StrategyRepository()
    const strategy = await repo.findById(strategyId, userId)

    if (!strategy) return errorResponse("Strategy not found")

    const entryConditions = JSON.stringify({
      conditions: strategy.config.entry,
      logic: strategy.config.entryLogic,
      risks: strategy.config.risks,
    })
    const exitConditions = JSON.stringify({
      conditions: strategy.config.exit,
      logic: strategy.config.exitLogic,
    })

    const result = await BacktestService.runBacktest({
      instrumentId: input.instrumentId ?? strategy.instrument,
      interval: input.interval ?? strategy.timeframe,
      fromDate: input.fromDate,
      toDate: input.toDate,
      entryConditions,
      exitConditions,
      positionSize: input.positionSize ?? 10000,
    })

    return successResponse(result)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Backtest failed")
  }
}
