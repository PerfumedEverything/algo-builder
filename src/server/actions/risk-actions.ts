"use server"

import type { ApiResponse, RiskMetrics } from "@/core/types"
import { successResponse, errorResponse } from "@/core/types"
import { RiskService } from "@/server/services"
import { redis } from "@/lib/redis"
import { getCurrentUserId } from "./helpers"

export const getRiskMetricsAction = async (): Promise<ApiResponse<RiskMetrics>> => {
  try {
    const userId = await getCurrentUserId()
    const cacheKey = `risk:${userId}`
    const cached = await redis.get(cacheKey)
    if (cached) return successResponse(JSON.parse(cached) as RiskMetrics)

    const service = new RiskService()
    const metrics = await service.calculate(userId)
    await redis.set(cacheKey, JSON.stringify(metrics), "EX", 86400)
    return successResponse(metrics)
  } catch (e) {
    return errorResponse((e as Error).message)
  }
}
