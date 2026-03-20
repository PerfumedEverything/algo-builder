import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { StrategyOperation } from "@/core/types"

export class OperationRepository {
  private async db() {
    return await createClient()
  }

  async create(input: {
    strategyId: string
    userId: string
    type: "BUY" | "SELL"
    instrument: string
    price: number
    quantity: number
    amount: number
  }) {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("StrategyOperation")
      .insert({
        ...input,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as StrategyOperation
  }

  async findByStrategyId(strategyId: string) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("StrategyOperation")
      .select("*")
      .eq("strategyId", strategyId)
      .order("createdAt", { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyOperation[]
  }

  async findByUserId(userId: string) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("StrategyOperation")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyOperation[]
  }

  async getStatsByStrategyId(strategyId: string) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("StrategyOperation")
      .select("*")
      .eq("strategyId", strategyId)
      .order("createdAt", { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyOperation[]
  }
}
