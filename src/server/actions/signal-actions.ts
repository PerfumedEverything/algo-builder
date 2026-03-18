"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { SignalCondition, SignalChannel } from "@/core/types"
import { createSignalSchema, updateSignalSchema } from "@/core/schemas"
import { SignalService } from "@/server/services"
import { getCurrentUserId } from "./helpers"

const getService = () => new SignalService()

export const getSignalsAction = async (
  filters?: { signalType?: string; isActive?: boolean; search?: string },
): Promise<ApiResponse<Awaited<ReturnType<SignalService["getSignals"]>>>> => {
  try {
    const userId = await getCurrentUserId()
    const signals = await getService().getSignals(userId, filters)
    return successResponse(signals)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getSignalStatsAction = async (): Promise<
  ApiResponse<{ total: number; active: number; inactive: number; buy: number; sell: number }>
> => {
  try {
    const userId = await getCurrentUserId()
    const stats = await getService().getStats(userId)
    return successResponse(stats)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const createSignalAction = async (
  data: {
    name: string
    description?: string
    instrument: string
    instrumentType?: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
    timeframe: string
    signalType: "BUY" | "SELL"
    conditions: SignalCondition[]
    channels: SignalChannel[]
  },
): Promise<ApiResponse<{ id: string }>> => {
  try {
    const parsed = createSignalSchema.safeParse(data)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message)
    }
    const userId = await getCurrentUserId()
    const signal = await getService().createSignal(userId, data)
    return successResponse({ id: signal.id })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const updateSignalAction = async (
  id: string,
  data: {
    name?: string
    description?: string
    instrument?: string
    instrumentType?: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
    timeframe?: string
    signalType?: "BUY" | "SELL"
    conditions?: SignalCondition[]
    channels?: SignalChannel[]
    isActive?: boolean
  },
): Promise<ApiResponse<{ id: string }>> => {
  try {
    const parsed = updateSignalSchema.safeParse(data)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message)
    }
    const userId = await getCurrentUserId()
    const signal = await getService().updateSignal(id, userId, data)
    return successResponse({ id: signal.id })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const toggleSignalAction = async (
  id: string,
): Promise<ApiResponse<{ id: string; isActive: boolean }>> => {
  try {
    const userId = await getCurrentUserId()
    const signal = await getService().toggleSignal(id, userId)
    return successResponse({ id: signal.id, isActive: signal.isActive })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const deleteSignalAction = async (
  id: string,
): Promise<ApiResponse<{ id: string }>> => {
  try {
    const userId = await getCurrentUserId()
    await getService().deleteSignal(id, userId)
    return successResponse({ id })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
