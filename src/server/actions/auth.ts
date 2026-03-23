"use server"

import { redirect } from "next/navigation"

import { loginSchema, registerSchema } from "@/core/schemas/auth"
import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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

export const forgotPasswordAction = async (
  formData: FormData,
): Promise<ApiResponse<null>> => {
  const email = formData.get("email") as string
  if (!email) return errorResponse("Введите email")

  try {
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aculatrade.com"
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    })
    if (error) return errorResponse(translateAuthError(error.message))
    return successResponse(null)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка отправки письма"
    return errorResponse(msg)
  }
}

export const resetPasswordAction = async (
  formData: FormData,
): Promise<ApiResponse<null>> => {
  const password = formData.get("password") as string
  if (!password || password.length < 6) return errorResponse("Пароль должен быть не менее 6 символов")

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return errorResponse(translateAuthError(error.message))
    return successResponse(null)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка сброса пароля"
    return errorResponse(msg)
  }
}
