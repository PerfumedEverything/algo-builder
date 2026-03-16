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

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return errorResponse(translateAuthError(error.message))
  }

  return successResponse({ email: parsed.data.email })
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

  const supabase = await createClient()
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
    },
  })

  if (error) {
    return errorResponse(translateAuthError(error.message))
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
}

export const logoutAction = async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
