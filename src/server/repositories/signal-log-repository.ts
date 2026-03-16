import { createClient } from "@/lib/supabase/server"

export type SignalLogRow = {
  id: string
  signalId: string
  instrument: string
  message: string
  triggeredAt: string
}

export class SignalLogRepository {
  private async db() {
    return await createClient()
  }

  async create(input: {
    signalId: string
    instrument: string
    message: string
  }) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("SignalLog")
      .insert({
        signalId: input.signalId,
        instrument: input.instrument,
        message: input.message,
        triggeredAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as SignalLogRow
  }

  async findBySignalId(signalId: string, limit = 10) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("SignalLog")
      .select("*")
      .eq("signalId", signalId)
      .order("triggeredAt", { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data ?? []) as SignalLogRow[]
  }

  async getRecentLogs(limit = 20) {
    const supabase = await this.db()
    const { data, error } = await supabase
      .from("SignalLog")
      .select("*")
      .order("triggeredAt", { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data ?? []) as SignalLogRow[]
  }
}
