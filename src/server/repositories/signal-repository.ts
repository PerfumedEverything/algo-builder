import { createClient } from "@/lib/supabase/server"
import type { SignalCondition, SignalChannel, LogicOperator } from "@/core/types"

export type SignalRow = {
  id: string
  userId: string
  name: string
  description: string | null
  instrument: string
  instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
  timeframe: string
  signalType: "BUY" | "SELL" | "ALERT"
  conditions: SignalCondition[]
  channels: SignalChannel[]
  logicOperator: LogicOperator
  isActive: boolean
  repeatMode: boolean
  lastTriggered: string | null
  triggerCount: number
  strategyId: string | null
  createdAt: string
  updatedAt: string
}

type SignalFilters = {
  signalType?: string
  isActive?: boolean
  triggered?: string
  search?: string
}

export class SignalRepository {
  private async db() {
    return await createClient()
  }

  async findByUserId(userId: string, filters?: SignalFilters) {
    const supabase = await this.db()
    let query = supabase
      .from("Signal")
      .select("*")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false })

    if (filters?.signalType) {
      query = query.eq("signalType", filters.signalType)
    }
    if (filters?.isActive !== undefined) {
      query = query.eq("isActive", filters.isActive)
    }
    if (filters?.triggered === "true") {
      query = query.eq("isActive", false).gt("triggerCount", 0)
    }
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,instrument.ilike.%${filters.search}%`,
      )
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as SignalRow[]
  }

  async findById(id: string) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("Signal")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return null
    return data as SignalRow
  }

  async create(input: {
    userId: string
    name: string
    description?: string
    instrument: string
    instrumentType?: string
    timeframe: string
    signalType: "BUY" | "SELL" | "ALERT"
    conditions: SignalCondition[]
    channels: SignalChannel[]
    logicOperator?: LogicOperator
    repeatMode?: boolean
    strategyId?: string
  }) {
    const supabase = await this.db()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("Signal")
      .insert({
        userId: input.userId,
        name: input.name,
        description: input.description ?? null,
        instrument: input.instrument,
        instrumentType: input.instrumentType ?? "STOCK",
        timeframe: input.timeframe,
        signalType: input.signalType,
        conditions: input.conditions,
        channels: input.channels,
        logicOperator: input.logicOperator ?? "AND",
        strategyId: input.strategyId ?? null,
        repeatMode: input.repeatMode ?? false,
        isActive: true,
        triggerCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as SignalRow
  }

  async update(id: string, userId: string, input: Record<string, unknown>) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("Signal")
      .update({ ...input, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .eq("userId", userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as SignalRow
  }

  async delete(id: string, userId: string) {
    const supabase = await this.db()
    const { error } = await supabase
      .from("Signal")
      .delete()
      .eq("id", id)
      .eq("userId", userId)

    if (error) throw new Error(error.message)
  }

  async getStats(userId: string) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("Signal")
      .select("isActive, signalType, triggerCount")
      .eq("userId", userId)

    if (error) throw new Error(error.message)
    const rows = data ?? []

    return {
      total: rows.length,
      active: rows.filter((r) => r.isActive).length,
      triggered: rows.filter((r) => !r.isActive && r.triggerCount > 0).length,
      buy: rows.filter((r) => r.signalType === "BUY").length,
      sell: rows.filter((r) => r.signalType === "SELL").length,
    }
  }
}
