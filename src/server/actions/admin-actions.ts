"use server"

import { AppError } from "@/core/errors/app-error"
import { successResponse, errorResponse } from "@/core/types/api"
import type { ApiResponse } from "@/core/types/api"
import { getCurrentUser, getCurrentUserId } from "./helpers"
import { UserRepository } from "@/server/repositories/user-repository"
import type { UserRole, UserWithStats } from "@/server/repositories/user-repository"
import { BrokerCatalogRepository } from "@/server/repositories/broker-catalog-repository"
import type { BrokerRow, CreateBrokerInput, UpdateBrokerInput } from "@/server/repositories/broker-catalog-repository"

const assertAdmin = async () => {
  const user = await getCurrentUser()
  if (user.role !== "ADMIN") throw AppError.forbidden()
  return user
}

type AdminData = {
  users: UserWithStats[]
  currentUserId: string
}

export const getUsersAction = async (): Promise<ApiResponse<AdminData>> => {
  try {
    const admin = await assertAdmin()
    const repo = new UserRepository()
    const users = await repo.findAll()
    return successResponse({ users, currentUserId: admin.id })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка загрузки пользователей")
  }
}

export const updateUserRoleAction = async (
  userId: string,
  role: UserRole,
): Promise<ApiResponse<null>> => {
  try {
    const admin = await assertAdmin()
    if (admin.id === userId) {
      return errorResponse("Нельзя изменить свою роль")
    }
    const repo = new UserRepository()
    await repo.updateRole(userId, role)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка обновления роли")
  }
}

export const blockUserAction = async (
  userId: string,
  blocked: boolean,
): Promise<ApiResponse<null>> => {
  try {
    const admin = await assertAdmin()
    if (admin.id === userId) {
      return errorResponse("Нельзя заблокировать себя")
    }
    const repo = new UserRepository()
    await repo.updateBlocked(userId, blocked)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка блокировки")
  }
}

export const getCurrentUserRoleAction = async (): Promise<ApiResponse<{ role: UserRole }>> => {
  try {
    const user = await getCurrentUser()
    return successResponse({ role: user.role })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка получения роли")
  }
}

export const getBrokersAction = async (): Promise<ApiResponse<BrokerRow[]>> => {
  try {
    await getCurrentUserId()
    const repo = new BrokerCatalogRepository()
    const brokers = await repo.findAll()
    return successResponse(brokers)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка загрузки брокеров")
  }
}

export const createBrokerAction = async (
  input: CreateBrokerInput,
): Promise<ApiResponse<BrokerRow>> => {
  try {
    await assertAdmin()
    const repo = new BrokerCatalogRepository()
    const broker = await repo.create(input)
    return successResponse(broker)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка создания брокера")
  }
}

export const updateBrokerAction = async (
  id: string,
  input: UpdateBrokerInput,
): Promise<ApiResponse<BrokerRow>> => {
  try {
    await assertAdmin()
    const repo = new BrokerCatalogRepository()
    const broker = await repo.update(id, input)
    return successResponse(broker)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка обновления брокера")
  }
}

export const deleteBrokerAction = async (
  id: string,
): Promise<ApiResponse<null>> => {
  try {
    await assertAdmin()
    const repo = new BrokerCatalogRepository()
    await repo.delete(id)
    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка удаления брокера")
  }
}

export const uploadBrokerLogoAction = async (
  brokerId: string,
  formData: FormData,
): Promise<ApiResponse<{ logoUrl: string }>> => {
  try {
    await assertAdmin()
    const file = formData.get("logo") as File
    if (!file) return errorResponse("Файл не выбран")

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
    const MAX_SIZE = 2 * 1024 * 1024
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse("Допустимые форматы: JPEG, PNG, WebP")
    }
    if (file.size > MAX_SIZE) {
      return errorResponse("Максимальный размер файла: 2 МБ")
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop() ?? "png"
    const fileName = `logo-${Date.now()}.${ext}`

    const repo = new BrokerCatalogRepository()
    const logoUrl = await repo.uploadLogo(brokerId, buffer, fileName)
    return successResponse({ logoUrl })
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка загрузки логотипа")
  }
}
