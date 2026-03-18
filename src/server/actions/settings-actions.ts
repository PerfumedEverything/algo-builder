"use server"

import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import { NotificationService } from "@/server/services"
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
