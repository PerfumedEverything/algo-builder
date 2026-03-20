import { createAdminClient } from "@/lib/supabase/admin"
import type { StrategyOperation } from "@/core/types"

export class OperationRepository {
  private db() {
    return createAdminClient()
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
    const { data, error } = await this.db()
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
    const { data, error } = await this.db()
      .from("StrategyOperation")
      .select("*")
      .eq("strategyId", strategyId)
      .order("createdAt", { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyOperation[]
  }

  async findByUserId(userId: string) {
    const { data, error } = await this.db()
      .from("StrategyOperation")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyOperation[]
  }

  async getStatsByStrategyId(strategyId: string) {
    const { data, error } = await this.db()
      .from("StrategyOperation")
      .select("*")
      .eq("strategyId", strategyId)
      .order("createdAt", { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyOperation[]
  }
}
