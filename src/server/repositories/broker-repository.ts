import { createClient } from "@/lib/supabase/server"

export type BrokerSettingsRow = {
  userId: string
  brokerToken: string | null
  brokerAccountId: string | null
  brokerType: string
}

export class BrokerRepository {
  private async db() {
    return await createClient()
  }

  async getSettings(userId: string): Promise<BrokerSettingsRow | null> {
    const supabase = await this.db()
    const { data } = await supabase
      .from("User")
      .select("brokerToken, brokerAccountId")
      .eq("id", userId)
      .single()

    if (!data) return null
    return {
      userId,
      brokerToken: data.brokerToken,
      brokerAccountId: data.brokerAccountId,
      brokerType: "TINKOFF",
    }
  }

  async saveToken(userId: string, token: string) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({
        brokerToken: token,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) throw new Error(error.message)
  }

  async saveAccountId(userId: string, accountId: string) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({
        brokerAccountId: accountId,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) throw new Error(error.message)
  }

  async disconnect(userId: string) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({
        brokerToken: null,
        brokerAccountId: null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) throw new Error(error.message)
  }
}
