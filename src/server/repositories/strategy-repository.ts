import { createClient } from "@/lib/supabase/server"
import type { StrategyConfig } from "@/core/types"

export type PositionState = "NONE" | "OPEN"

export type StrategyRow = {
  id: string
  userId: string
  name: string
  description: string | null
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "TRIGGERED"
  positionState: PositionState
  instrument: string
  instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
  timeframe: string
  config: StrategyConfig
  createdAt: string
  updatedAt: string
}

type StrategyFilters = {
  status?: string
  search?: string
}

export class StrategyRepository {
  private async db() {
    return await createClient()
  }

  async findByUserId(userId: string, filters?: StrategyFilters) {
    const supabase = await this.db()
    let query = supabase
      .from("Strategy")
      .select("*")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false })

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,instrument.ilike.%${filters.search}%`,
      )
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyRow[]
  }

  async findById(id: string) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("Strategy")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return null
    return data as StrategyRow
  }

  async create(input: {
    userId: string
    name: string
    description?: string
    instrument: string
    instrumentType?: string
    timeframe: string
    config: StrategyConfig
  }) {
    const supabase = await this.db()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("Strategy")
      .insert({
        userId: input.userId,
        name: input.name,
        description: input.description ?? null,
        status: "DRAFT",
        positionState: "NONE",
        instrument: input.instrument,
        instrumentType: input.instrumentType ?? "STOCK",
        timeframe: input.timeframe,
        config: input.config,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as StrategyRow
  }

  async update(id: string, userId: string, input: Record<string, unknown>) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("Strategy")
      .update({ ...input, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .eq("userId", userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as StrategyRow
  }

  async delete(id: string, userId: string) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("Strategy")
      .delete()
      .eq("id", id)
      .eq("userId", userId)

    if (error) throw new Error(error.message)
  }

  async getStats(userId: string) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("Strategy")
      .select("status")
      .eq("userId", userId)

    if (error) throw new Error(error.message)
    const rows = data ?? []

    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "ACTIVE").length,
      draft: rows.filter((r) => r.status === "DRAFT").length,
      paused: rows.filter((r) => r.status === "PAUSED").length,
      triggered: rows.filter((r) => r.status === "TRIGGERED").length,
    }
  }
}
