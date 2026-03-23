"use server"

import { redirect } from "next/navigation"

import { randomInt, timingSafeEqual } from "crypto"

import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  requestOtpSchema,
  resetWithOtpSchema,
} from "@/core/schemas/auth"
import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import { createAdminClient } from "@/lib/supabase/admin"
import { redis } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import { UserRepository } from "@/server/repositories"
import { getNotificationProvider } from "@/server/providers/notification"

const authErrorMap: Record<string, string> = {
  "Invalid login credentials": "Неверный email или пароль",
  "Email not confirmed": "Email не подтверждён",
  "User already registered": "Пользователь с таким email уже зарегистрирован",
  "Password should be at least 6 characters": "Пароль должен быть не менее 6 символов",
  "Unable to validate email address: invalid format": "Некорректный формат email",
}

const translateAuthError = (msg: string): string => authErrorMap[msg] ?? msg

export const loginAction = async (
  formData: FormData,
): Promise<ApiResponse<{ email: string }>> => {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message)
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      const msg = error.message || error.status?.toString() || "Неизвестная ошибка авторизации"
      return errorResponse(translateAuthError(msg))
    }

    return successResponse({ email: parsed.data.email })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка подключения к серверу авторизации"
    return errorResponse(msg)
  }
}

export const registerAction = async (
  formData: FormData,
): Promise<ApiResponse<{ email: string }>> => {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message)
  }

  try {
    const supabase = await createClient()
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
      },
    })

    if (error) {
      const msg = error.message || error.status?.toString() || "Неизвестная ошибка регистрации"
      return errorResponse(translateAuthError(msg))
    }

    if (signUpData.user) {
      const now = new Date().toISOString()
      const admin = createAdminClient()
      await admin.from("User").upsert(
        {
          supabaseId: signUpData.user.id,
          email: parsed.data.email,
          name: parsed.data.name || null,
          createdAt: now,
          updatedAt: now,
        },
        { onConflict: "supabaseId" },
      )
    }

    return successResponse({ email: parsed.data.email })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка подключения к серверу авторизации"
    return errorResponse(msg)
  }
}

export const logoutAction = async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

const CHANGE_PWD_RATE_PREFIX = "change_password_rate"
const CHANGE_PWD_RATE_LIMIT = 5
const CHANGE_PWD_RATE_TTL = 900

export const changePasswordAction = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ApiResponse<null>> => {
  const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword })
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return errorResponse("Не удалось определить пользователя")

    const rateKey = `${CHANGE_PWD_RATE_PREFIX}:${user.id}`
    const pipeline = redis.pipeline()
    pipeline.incr(rateKey)
    pipeline.expire(rateKey, CHANGE_PWD_RATE_TTL)
    const results = await pipeline.exec()
    const attempts = results?.[0]?.[1] as number
    if (attempts > CHANGE_PWD_RATE_LIMIT) return errorResponse("Слишком много попыток. Попробуйте через 15 минут")

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) return errorResponse("Неверный текущий пароль")

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return errorResponse(translateAuthError(error.message))

    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка смены пароля")
  }
}

const OTP_PREFIX = "password_reset"
const OTP_TTL = 600
const OTP_RATE_PREFIX = "password_reset_rate"
const OTP_RATE_LIMIT = 3
const OTP_RATE_TTL = 900
const OTP_ATTEMPT_PREFIX = "password_reset_attempts"
const OTP_MAX_ATTEMPTS = 5

const normalizeEmail = (email: string) => email.toLowerCase().trim()

export const requestPasswordOtpAction = async (
  email: string,
): Promise<ApiResponse<null>> => {
  const parsed = requestOtpSchema.safeParse({ email })
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message)

  try {
    const normalized = normalizeEmail(parsed.data.email)
    const rateKey = `${OTP_RATE_PREFIX}:${normalized}`
    const pipeline = redis.pipeline()
    pipeline.incr(rateKey)
    pipeline.expire(rateKey, OTP_RATE_TTL)
    const results = await pipeline.exec()
    const attempts = results?.[0]?.[1] as number
    if (attempts > OTP_RATE_LIMIT) return errorResponse("Слишком много попыток. Попробуйте через 15 минут")

    const repo = new UserRepository()
    const user = await repo.findByEmail(normalized)
    if (!user || !user.telegramChatId) {
      return successResponse(null)
    }

    const code = randomInt(0, 1000000).toString().padStart(6, "0")
    await redis.setex(`${OTP_PREFIX}:${normalized}`, OTP_TTL, code)

    const provider = getNotificationProvider()
    await provider.send(
      user.telegramChatId,
      `🔐 *Код для сброса пароля AculaTrade*\n\nВаш код: \`${code}\`\n\nДействителен 10 минут. Если вы не запрашивали сброс — проигнорируйте это сообщение.`,
    )

    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка отправки кода")
  }
}

export const resetPasswordWithOtpAction = async (
  email: string,
  code: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ApiResponse<null>> => {
  const parsed = resetWithOtpSchema.safeParse({ email, code, newPassword, confirmPassword })
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message)

  try {
    const normalized = normalizeEmail(parsed.data.email)
    const otpKey = `${OTP_PREFIX}:${normalized}`
    const attemptKey = `${OTP_ATTEMPT_PREFIX}:${normalized}`

    const attemptPipeline = redis.pipeline()
    attemptPipeline.incr(attemptKey)
    attemptPipeline.expire(attemptKey, OTP_TTL)
    const attemptResults = await attemptPipeline.exec()
    const attempts = attemptResults?.[0]?.[1] as number
    if (attempts > OTP_MAX_ATTEMPTS) {
      await redis.del(otpKey)
      await redis.del(attemptKey)
      return errorResponse("Слишком много попыток. Запросите новый код")
    }

    const storedCode = await redis.get(otpKey)
    const codesMatch =
      storedCode !== null &&
      storedCode.length === code.length &&
      timingSafeEqual(Buffer.from(storedCode), Buffer.from(code))

    if (!codesMatch) return errorResponse("Неверный или истёкший код")

    await redis.del(otpKey)
    await redis.del(attemptKey)

    const repo = new UserRepository()
    const user = await repo.findByEmail(normalized)
    if (!user) return errorResponse("Ошибка сброса пароля")

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(user.supabaseId, {
      password: newPassword,
    })
    if (error) return errorResponse(translateAuthError(error.message))

    return successResponse(null)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Ошибка сброса пароля")
  }
}
