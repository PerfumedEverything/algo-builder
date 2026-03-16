"use server"

import { redirect } from "next/navigation"

import { loginSchema, registerSchema } from "@/core/schemas/auth"
import { type ApiResponse, errorResponse, successResponse } from "@/core/types/api"
import { createClient } from "@/lib/supabase/server"

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
    return errorResponse(error.message)
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
    return errorResponse(error.message)
  }

  if (signUpData.user) {
    const now = new Date().toISOString()
    await supabase.from("User").upsert(
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
