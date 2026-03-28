"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import { NotificationService } from "@/server/services"
import { BrokerRepository } from "@/server/repositories/broker-repository"
import { BybitProvider } from "@/server/providers/broker/bybit-provider"
import { getCurrentUserId } from "./helpers"

const getService = () => new NotificationService()

export const getSettingsAction = async (): Promise<
  ApiResponse<{ name: string | null; email: string | null; maxChatId: string | null; telegramChatId: string | null }>
> => {
  try {
    const userId = await getCurrentUserId()
    const settings = await getService().getSettings(userId)
    return successResponse(settings)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const updateProfileAction = async (
  name: string,
): Promise<ApiResponse<null>> => {
  try {
    if (!name.trim()) return errorResponse("Имя обязательно")
    const userId = await getCurrentUserId()
    await getService().updateProfile(userId, name.trim())
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const saveMaxChatIdAction = async (
  chatId: string,
): Promise<ApiResponse<null>> => {
  try {
    if (!chatId.trim()) return errorResponse("Chat ID обязателен")
    const userId = await getCurrentUserId()
    await getService().saveMaxChatId(userId, chatId.trim())
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const removeMaxChatIdAction = async (): Promise<ApiResponse<null>> => {
  try {
    const userId = await getCurrentUserId()
    await getService().removeMaxChatId(userId)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const saveTelegramChatIdAction = async (
  chatId: string,
): Promise<ApiResponse<null>> => {
  try {
    if (!chatId.trim()) return errorResponse("Chat ID обязателен")
    const userId = await getCurrentUserId()
    await getService().saveTelegramChatId(userId, chatId.trim())
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const removeTelegramChatIdAction = async (): Promise<ApiResponse<null>> => {
  try {
    const userId = await getCurrentUserId()
    await getService().removeTelegramChatId(userId)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const testNotificationAction = async (): Promise<ApiResponse<boolean>> => {
  try {
    const userId = await getCurrentUserId()
    const result = await getService().testNotification(userId)
    return successResponse(result)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}

export const switchBrokerAction = async (brokerType: string): Promise<ApiResponse<void>> => {
  try {
    const userId = await getCurrentUserId()
    if (brokerType !== "TINKOFF" && brokerType !== "BYBIT") {
      return errorResponse("Неверный тип брокера")
    }
    const repo = new BrokerRepository()
    await repo.saveBrokerType(userId, brokerType)
    return successResponse(undefined)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка переключения брокера")
  }
}

export const connectBybitAction = async (apiKey: string, apiSecret: string): Promise<ApiResponse<void>> => {
  try {
    const userId = await getCurrentUserId()
    const provider = new BybitProvider()
    await provider.connect(`${apiKey}:${apiSecret}`)
    await provider.getAccounts()
    await provider.disconnect()
    const repo = new BrokerRepository()
    await repo.saveBybitCredentials(userId, apiKey, apiSecret)
    return successResponse(undefined)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка подключения к Bybit")
  }
}

export const getBrokerSettingsAction = async (): Promise<ApiResponse<{ brokerType: string; hasApiKey: boolean }>> => {
  try {
    const userId = await getCurrentUserId()
    const repo = new BrokerRepository()
    const settings = await repo.getSettings(userId)
    return successResponse({
      brokerType: settings?.brokerType ?? "TINKOFF",
      hasApiKey: !!(settings?.bybitApiKey && settings?.bybitApiSecret),
    })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка загрузки настроек брокера")
  }
}
