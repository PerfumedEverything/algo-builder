"use server"

import { createClient } from "@/lib/supabase/server"
import { AppError } from "@/core/errors/app-error"

const DEV_USER_ID = "dev-user-id"

export const getCurrentUserId = async (): Promise<string> => {
  if (process.env.NODE_ENV === "development") {
    const supabase = await createClient()
    const { data } = await supabase
      .from("User")
      .select("id")
      .eq("email", "dev@algobuilder.local")
      .single()

    if (data) return data.id

    const { data: created, error } = await supabase
      .from("User")
      .insert({
        id: DEV_USER_ID,
        email: "dev@algobuilder.local",
        supabaseId: "dev-bypass",
        name: "Dev User",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) throw new Error(error.message)
    return created!.id
  }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) throw AppError.unauthorized()

  const { data } = await supabase
    .from("User")
    .select("id")
    .eq("supabaseId", authData.user.id)
    .single()

  if (!data) throw AppError.unauthorized()
  return data.id
}
