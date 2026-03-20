"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AppError } from "@/core/errors/app-error"
import type { UserRole } from "@/server/repositories/user-repository"

type CurrentUser = {
  id: string
  role: UserRole
}

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) throw AppError.unauthorized()

  const { data } = await supabase
    .from("User")
    .select("id, role")
    .eq("supabaseId", authData.user.id)
    .single()

  if (data) return { id: data.id, role: (data.role ?? "USER") as UserRole }

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
    .select("id, role")
    .single()

  if (error) throw new Error(error.message)
  return { id: created!.id, role: (created!.role ?? "USER") as UserRole }
}

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
