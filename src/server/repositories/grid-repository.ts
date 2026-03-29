import { createClient } from "@/lib/supabase/server"

export type GridOrderSide = "BUY" | "SELL"
export type GridOrderStatus = "PENDING" | "FILLED" | "CANCELLED"

export type GridOrderRow = {
  id: string
  gridId: string
  userId: string
  levelIndex: number
  price: number
  side: GridOrderSide
  quantity: number
  status: GridOrderStatus
  filledAt: string | null
  filledPrice: number | null
  realizedPnl: number
  createdAt: string
  updatedAt: string
}

type GridOrderInsert = {
  levelIndex: number
  price: number
  side: GridOrderSide
  quantity: number
}

type GridStats = {
  totalBuys: number
  totalSells: number
  realizedPnl: number
}

function mapRow(row: Record<string, unknown>): GridOrderRow {
  return {
    id: row.id as string,
    gridId: row.grid_id as string,
    userId: row.user_id as string,
    levelIndex: row.level_index as number,
    price: Number(row.price),
    side: row.side as GridOrderSide,
    quantity: Number(row.quantity),
    status: row.status as GridOrderStatus,
    filledAt: (row.filled_at as string) ?? null,
    filledPrice: row.filled_price != null ? Number(row.filled_price) : null,
    realizedPnl: Number(row.realized_pnl ?? 0),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export class GridRepository {
  private async db() {
    return await createClient()
  }

  async createOrders(
    gridId: string,
    userId: string,
    orders: GridOrderInsert[],
  ): Promise<void> {
    const supabase = await this.db()
    const now = new Date().toISOString()
    const rows = orders.map((o) => ({
      grid_id: gridId,
      user_id: userId,
      level_index: o.levelIndex,
      price: o.price,
      side: o.side,
      quantity: o.quantity,
      status: "PENDING",
      created_at: now,
      updated_at: now,
    }))
    const { error } = await supabase.from("grid_orders").insert(rows)
    if (error) throw new Error(error.message)
  }

  async getOrdersByGridId(
    gridId: string,
    userId: string,
  ): Promise<GridOrderRow[]> {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("grid_orders")
      .select("*")
      .eq("grid_id", gridId)
      .eq("user_id", userId)
      .order("level_index", { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
  }

  async getPendingOrders(
    gridId: string,
    userId: string,
  ): Promise<GridOrderRow[]> {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("grid_orders")
      .select("*")
      .eq("grid_id", gridId)
      .eq("user_id", userId)
      .eq("status", "PENDING")
      .order("level_index", { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
  }

  async fillOrder(
    gridId: string,
    levelIndex: number,
    side: GridOrderSide,
    filledPrice: number,
    realizedPnl: number,
  ): Promise<boolean> {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("grid_orders")
      .update({
        status: "FILLED",
        filled_at: new Date().toISOString(),
        filled_price: filledPrice,
        realized_pnl: realizedPnl,
        updated_at: new Date().toISOString(),
      })
      .eq("grid_id", gridId)
      .eq("level_index", levelIndex)
      .eq("side", side)
      .eq("status", "PENDING")
      .select()
    if (error) throw new Error(error.message)
    return (data ?? []).length > 0
  }

  async activateCounterOrder(
    gridId: string,
    levelIndex: number,
    side: GridOrderSide,
    quantity: number,
    price: number,
    userId: string,
  ): Promise<void> {
    const supabase = await this.db()
    const now = new Date().toISOString()
    const { error } = await supabase.from("grid_orders").upsert(
      {
        grid_id: gridId,
        user_id: userId,
        level_index: levelIndex,
        side,
        quantity,
        price,
        status: "PENDING",
        filled_at: null,
        filled_price: null,
        realized_pnl: 0,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "grid_id,level_index,side" },
    )
    if (error) throw new Error(error.message)
  }

  async cancelAllPending(gridId: string, userId: string): Promise<number> {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("grid_orders")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("grid_id", gridId)
      .eq("user_id", userId)
      .eq("status", "PENDING")
      .select()
    if (error) throw new Error(error.message)
    return (data ?? []).length
  }

  async getGridStats(gridId: string, userId: string): Promise<GridStats> {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("grid_orders")
      .select("side, realized_pnl")
      .eq("grid_id", gridId)
      .eq("user_id", userId)
      .eq("status", "FILLED")
    if (error) throw new Error(error.message)
    const rows = data ?? []
    return {
      totalBuys: rows.filter((r) => r.side === "BUY").length,
      totalSells: rows.filter((r) => r.side === "SELL").length,
      realizedPnl: rows.reduce((sum, r) => sum + Number(r.realized_pnl ?? 0), 0),
    }
  }

  async deleteByGridId(gridId: string, userId: string): Promise<void> {
    const supabase = await this.db()
    const { error } = await supabase
      .from("grid_orders")
      .delete()
      .eq("grid_id", gridId)
      .eq("user_id", userId)
    if (error) throw new Error(error.message)
  }
}
