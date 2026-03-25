import { createAdminClient } from "@/lib/supabase/admin"
import type { SignalRow } from "@/server/repositories/signal-repository"
import { TelegramProvider } from "@/server/providers/notification"

type CheckResult = {
  signalId: string
  triggered: boolean
  message: string
}

export class SignalTriggerHandler {
  private _telegram?: TelegramProvider

  constructor(private db: ReturnType<typeof createAdminClient>) {}

  private get telegram(): TelegramProvider | null {
    if (this._telegram) return this._telegram
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return null
    this._telegram = new TelegramProvider(token)
    return this._telegram
  }

  async handle(signal: SignalRow, result: CheckResult) {
    const { data: updated } = await this.db.from("Signal")
      .update({ triggerCount: signal.triggerCount + 1, lastTriggered: new Date().toISOString(), isActive: !!signal.repeatMode, updatedAt: new Date().toISOString() })
      .eq("id", signal.id).eq("triggerCount", signal.triggerCount).select("id")
    if (!updated?.length) return

    await this.db.from("SignalLog").insert({ signalId: signal.id, instrument: signal.instrument, message: result.message, triggeredAt: new Date().toISOString() })

    const { data: user } = await this.db.from("User").select("telegramChatId").eq("id", signal.userId).single()
    if (!user) return

    for (const channel of [...new Set(signal.channels)]) {
      if (channel === "telegram" && user.telegramChatId && this.telegram) {
        try {
          await this.telegram.send(user.telegramChatId, result.message)
        } catch (e) {
          console.error(`[SignalChecker] Telegram failed signal ${signal.id}:`, e)
        }
      }
    }
  }
}
