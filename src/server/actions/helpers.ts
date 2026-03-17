"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AppError } from "@/core/errors/app-error"

export const getCurrentUserId = async (): Promise<string> => {
  console.log("[auth] creating supabase client...")
  const supabase = await createClient()
  console.log("[auth] client created, calling getUser...")
  const { data: authData, error: authError } = await supabase.auth.getUser()
  console.log("[auth] getUser result:", authData?.user?.id ?? "no user", authError?.message ?? "no error")
  if (!authData.user) throw AppError.unauthorized()

  console.log("[auth] querying User table...")
  const { data, error: dbError } = await supabase
    .from("User")
    .select("id")
    .eq("supabaseId", authData.user.id)
    .single()
  console.log("[auth] User query result:", data?.id ?? "not found", dbError?.message ?? "no error")

  if (data) return data.id

  const admin = createAdminClient()
  const { data: created, error } = await admin
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
