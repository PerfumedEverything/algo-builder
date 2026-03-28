import { createClient } from "@/lib/supabase/server"

export type BrokerSettingsRow = {
  userId: string
  brokerToken: string | null
  brokerAccountId: string | null
  brokerType: string
  bybitApiKey: string | null
  bybitApiSecret: string | null
  connectionToken: string | null
}

export class BrokerRepository {
  private async db() {
    return await createClient()
  }

  async getSettings(userId: string): Promise<BrokerSettingsRow | null> {
    const supabase = await this.db()
    const { data } = await supabase
      .from("User")
      .select("brokerToken, brokerAccountId, brokerType, bybitApiKey, bybitApiSecret")
      .eq("id", userId)
      .single()

    if (!data) return null
    const brokerType = data.brokerType ?? "TINKOFF"
    const connectionToken =
      brokerType === "BYBIT" && data.bybitApiKey && data.bybitApiSecret
        ? `${data.bybitApiKey}:${data.bybitApiSecret}`
        : data.brokerToken ?? null
    return {
      userId,
      brokerToken: data.brokerToken,
      brokerAccountId: data.brokerAccountId,
      brokerType,
      bybitApiKey: data.bybitApiKey ?? null,
      bybitApiSecret: data.bybitApiSecret ?? null,
      connectionToken,
    }
  }

  async getBrokerType(userId: string): Promise<string> {
    const supabase = await this.db()
    const { data } = await supabase
      .from("User")
      .select("brokerType")
      .eq("id", userId)
      .single()

    return data?.brokerType ?? "TINKOFF"
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

  async saveBrokerType(userId: string, brokerType: string): Promise<void> {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({
        brokerType,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) throw new Error(error.message)
  }

  async saveBybitCredentials(userId: string, apiKey: string, apiSecret: string): Promise<void> {
    const supabase = await this.db()
    const { error } = await supabase
      .from("User")
      .update({
        bybitApiKey: apiKey,
        bybitApiSecret: apiSecret,
        brokerType: "BYBIT",
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
