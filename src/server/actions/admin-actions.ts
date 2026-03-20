"use server"

import { AppError } from "@/core/errors/app-error"
import { successResponse, errorResponse } from "@/core/types/api"
import type { ApiResponse } from "@/core/types/api"
import { getCurrentUser } from "./helpers"
import { UserRepository } from "@/server/repositories/user-repository"
import type { UserRole, UserWithStats } from "@/server/repositories/user-repository"

const assertAdmin = async () => {
  const user = await getCurrentUser()
  if (user.role !== "ADMIN") throw AppError.forbidden()
  return user
}

export const getUsersAction = async (): Promise<ApiResponse<UserWithStats[]>> => {
  try {
    await assertAdmin()
    const repo = new UserRepository()
    const users = await repo.findAll()
    return successResponse(users)
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
