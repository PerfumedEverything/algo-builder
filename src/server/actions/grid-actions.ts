"use server"

import { z } from "zod"
import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { GridTickResult } from "@/core/types/grid"
import type { GridOrderRow } from "@/server/repositories/grid-repository"
import { GridTradingService } from "@/server/services/grid-trading-service"
import { getCurrentUserId } from "./helpers"

const gridConfigSchema = z
  .object({
    type: z.literal("GRID"),
    lowerPrice: z.number().positive(),
    upperPrice: z.number().positive(),
    gridLevels: z.number().int().min(3).max(100),
    amountPerOrder: z.number().positive(),
    gridDistribution: z.enum(["ARITHMETIC", "GEOMETRIC"]),
    stopLoss: z.number().positive().optional(),
    takeProfit: z.number().positive().optional(),
    feeRate: z.number().min(0).max(0.01),
  })
  .refine((d) => d.upperPrice > d.lowerPrice, {
    message: "Upper price must be greater than lower price",
  })

const getService = () => new GridTradingService()

type CreateGridParams = {
  name: string
  instrument: string
  instrumentType: string
  config: z.infer<typeof gridConfigSchema>
  currentPrice: number
}

export const createGridAction = async (
  params: CreateGridParams,
): Promise<ApiResponse<{ gridId: string }>> => {
  try {
    const userId = await getCurrentUserId()
    const parsed = gridConfigSchema.safeParse(params.config)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message)
    }

    const { config, currentPrice } = params
    if (currentPrice < config.lowerPrice || currentPrice > config.upperPrice) {
      return errorResponse("Current price must be within grid range (lowerPrice to upperPrice)")
    }

    const gridId = await getService().createGrid({ userId, ...params, config: parsed.data })
    return successResponse({ gridId })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const stopGridAction = async (
  gridId: string,
): Promise<ApiResponse<{ cancelledCount: number; stats: { totalBuys: number; totalSells: number; realizedPnl: number } }>> => {
  try {
    const userId = await getCurrentUserId()
    const result = await getService().stopGrid(gridId, userId)
    return successResponse(result)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getGridStatusAction = async (
  gridId: string,
): Promise<ApiResponse<{ orders: GridOrderRow[]; stats: { totalBuys: number; totalSells: number; realizedPnl: number } }>> => {
  try {
    const userId = await getCurrentUserId()
    const result = await getService().getGridStatus(gridId, userId)
    return successResponse(result)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const processGridTickAction = async (
  gridId: string,
  currentPrice: number,
): Promise<ApiResponse<GridTickResult>> => {
  try {
    const userId = await getCurrentUserId()
    const result = await getService().processPriceTick(gridId, userId, currentPrice)
    return successResponse(result)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
