import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type UserRole = "USER" | "ADMIN"

export type UserRow = {
  id: string
  email: string
  name: string | null
  supabaseId: string
  role: UserRole
  blocked: boolean
  maxChatId: string | null
  telegramChatId: string | null
  brokerToken: string | null
  brokerAccountId: string | null
  createdAt: string
}

export type UserWithStats = UserRow & {
  strategiesCount: number
  signalsCount: number
}

export class UserRepository {
  private async db() {
    return await createClient()
  }

  async findById(id: string): Promise<UserRow | null> {
    const supabase = await this.db()
    const { data } = await supabase
      .from("User")
      .select("*")
      .eq("id", id)
      .single()

    return data as UserRow | null
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const admin = createAdminClient()
    const { data } = await admin
      .from("User")
      .select("*")
      .eq("email", email)
      .single()

    return data as UserRow | null
  }

  async findAll(): Promise<UserWithStats[]> {
    const admin = createAdminClient()
    const { data: users, error } = await admin
      .from("User")
      .select("id, email, name, supabaseId, role, blocked, maxChatId, telegramChatId, brokerAccountId, createdAt")
      .order("createdAt", { ascending: false })

    if (error) throw new Error(error.message)
    if (!users) return []

    const userIds = (users as { id: string }[]).map((u) => u.id)

    const [strategiesRes, signalsRes] = await Promise.all([
      admin.from("Strategy").select("userId").in("userId", userIds),
      admin.from("Signal").select("userId").in("userId", userIds),
    ])

    const strategyCounts = new Map<string, number>()
    const signalCounts = new Map<string, number>()

    for (const s of strategiesRes.data ?? []) {
      strategyCounts.set(s.userId, (strategyCounts.get(s.userId) ?? 0) + 1)
    }
    for (const s of signalsRes.data ?? []) {
      signalCounts.set(s.userId, (signalCounts.get(s.userId) ?? 0) + 1)
    }

    return (users as Omit<UserRow, "brokerToken">[]).map((u) => ({
      ...u,
      brokerToken: null,
      strategiesCount: strategyCounts.get(u.id) ?? 0,
      signalsCount: signalCounts.get(u.id) ?? 0,
    }))
  }

  async updateProfile(id: string, input: { name?: string }) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({ ...input, updatedAt: new Date().toISOString() })
      .eq("id", id)

    if (error) throw new Error(error.message)
  }

  async updateRole(id: string, role: UserRole) {
    const admin = createAdminClient()
    const { error } = await admin
      .from("User")
      .update({ role, updatedAt: new Date().toISOString() })
      .eq("id", id)

    if (error) throw new Error(error.message)
  }

  async updateBlocked(id: string, blocked: boolean) {
    const admin = createAdminClient()
    const { error } = await admin
      .from("User")
      .update({ blocked, updatedAt: new Date().toISOString() })
      .eq("id", id)

    if (error) throw new Error(error.message)
  }

  async updateMaxChatId(id: string, chatId: string | null) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({ maxChatId: chatId, updatedAt: new Date().toISOString() })
      .eq("id", id)

    if (error) throw new Error(error.message)
  }

  async updateTelegramChatId(id: string, chatId: string | null) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({ telegramChatId: chatId, updatedAt: new Date().toISOString() })
      .eq("id", id)

    if (error) throw new Error(error.message)
  }
}
