import { createClient } from "@/lib/supabase/server"

export type UserRow = {
  id: string
  email: string
  name: string | null
  supabaseId: string
  maxChatId: string | null
  telegramChatId: string | null
  brokerToken: string | null
  brokerAccountId: string | null
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

  async updateProfile(id: string, input: { name?: string }) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({ ...input, updatedAt: new Date().toISOString() })
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
}
