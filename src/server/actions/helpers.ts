"use server"

import { createClient } from "@/lib/supabase/server"
import { AppError } from "@/core/errors/app-error"

export const getCurrentUserId = async (): Promise<string> => {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) throw AppError.unauthorized()

  const { data } = await supabase
    .from("User")
    .select("id")
    .eq("supabaseId", authData.user.id)
    .single()

  if (data) return data.id

  const { data: created, error } = await supabase
    .from("User")
    .insert({
      supabaseId: authData.user.id,
      email: authData.user.email!,
      name: authData.user.user_metadata?.name ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return created!.id
}
