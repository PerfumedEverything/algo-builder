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

  async findByStrategyId(strategyId: string, userId?: string) {
    let query = this.db()
      .from("StrategyOperation")
      .select("*")
      .eq("strategyId", strategyId)
      .order("createdAt", { ascending: false })
    if (userId) {
      query = query.eq("userId", userId)
    }
    const { data, error } = await query

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

  async getStatsByStrategyId(strategyId: string, userId?: string) {
    let query = this.db()
      .from("StrategyOperation")
      .select("*")
      .eq("strategyId", strategyId)
      .order("createdAt", { ascending: true })
    if (userId) {
      query = query.eq("userId", userId)
    }
    const { data, error } = await query

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyOperation[]
  }
}
