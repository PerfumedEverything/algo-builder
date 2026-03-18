"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import type { BrokerAccount, Portfolio, BrokerInstrument } from "@/core/types"
import { BrokerService } from "@/server/services"
import { getCurrentUserId } from "./helpers"

let _service: BrokerService | null = null
const getService = () => {
  if (!_service) _service = new BrokerService()
  return _service
}

export const connectBrokerAction = async (
  token: string,
): Promise<ApiResponse<BrokerAccount[]>> => {
  try {
    if (!token.trim()) return errorResponse("Токен обязателен")
    const userId = await getCurrentUserId()
    const accounts = await getService().connect(userId, token)
    return successResponse(accounts)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const disconnectBrokerAction = async (): Promise<ApiResponse<null>> => {
  try {
    const userId = await getCurrentUserId()
    await getService().disconnect(userId)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getBrokerStatusAction = async (): Promise<
  ApiResponse<{ connected: boolean; accountId: string | null }>
> => {
  try {
    const userId = await getCurrentUserId()
    const status = await getService().getConnectionStatus(userId)
    return successResponse(status)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getBrokerAccountsAction = async (): Promise<ApiResponse<BrokerAccount[]>> => {
  try {
    const userId = await getCurrentUserId()
    const accounts = await getService().getAccounts(userId)
    return successResponse(accounts)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const selectBrokerAccountAction = async (
  accountId: string,
): Promise<ApiResponse<null>> => {
  try {
    const userId = await getCurrentUserId()
    await getService().selectAccount(userId, accountId)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getPortfolioAction = async (): Promise<ApiResponse<Portfolio | null>> => {
  try {
    const userId = await getCurrentUserId()
    const portfolio = await getService().getPortfolio(userId)
    return successResponse(portfolio)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const sandboxPayInAction = async (
  amount: number,
): Promise<ApiResponse<null>> => {
  try {
    if (amount <= 0 || amount > 10_000_000) return errorResponse("Сумма от 1 до 10 000 000 ₽")
    const userId = await getCurrentUserId()
    await getService().sandboxPayIn(userId, amount)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const getInstrumentsAction = async (
  type: string,
): Promise<ApiResponse<BrokerInstrument[]>> => {
  try {
    const userId = await getCurrentUserId()
    const instruments = await getService().getInstruments(userId, type)
    return successResponse(instruments)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
