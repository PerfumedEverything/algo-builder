import { createAdminClient } from "@/lib/supabase/admin"
import type { SignalCondition } from "@/core/types"
import type { SignalRow } from "@/server/repositories/signal-repository"
import { getBrokerProvider } from "@/server/providers/broker"
import { TelegramProvider } from "@/server/providers/notification"

type CheckResult = {
  signalId: string
  signalName: string
  instrument: string
  triggered: boolean
  message: string
}

export class SignalChecker {
  private _telegram?: TelegramProvider
  private _db?: ReturnType<typeof createAdminClient>

  private get telegram(): TelegramProvider | null {
    if (this._telegram) return this._telegram
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return null
    this._telegram = new TelegramProvider(token)
    return this._telegram
  }

  private get db() {
    if (!this._db) this._db = createAdminClient()
    return this._db
  }

  async checkAll(): Promise<CheckResult[]> {
    const signals = await this.getActiveSignals()
    const results: CheckResult[] = []

    for (const signal of signals) {
      try {
        const result = await this.checkSignal(signal)
        results.push(result)
        if (result.triggered) {
          await this.handleTriggered(signal, result)
        }
      } catch (e) {
        results.push({
          signalId: signal.id,
          signalName: signal.name,
          instrument: signal.instrument,
          triggered: false,
          message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
        })
      }
    }

    return results
  }

  async checkSignal(signal: SignalRow): Promise<CheckResult> {
    const price = await this.getPrice(signal)

    const allMet = signal.conditions.every((condition) =>
      this.evaluateCondition(condition, price),
    )

    const typeLabel = signal.signalType === "BUY" ? "Покупка" : "Продажа"
    const message = allMet
      ? `🔔 *${signal.name}*\n📊 ${signal.instrument} — ${typeLabel}\n💰 Цена: ${price.toFixed(2)}\n📋 Все условия выполнены\n🕐 ${new Date().toLocaleString("ru-RU")}`
      : `${signal.instrument}: условия не выполнены (цена: ${price.toFixed(2)})`

    return {
      signalId: signal.id,
      signalName: signal.name,
      instrument: signal.instrument,
      triggered: allMet,
      message,
    }
  }

  evaluateCondition(condition: SignalCondition, price: number): boolean {
    const value = condition.value ?? 0
    return this.compare(price, condition.condition, value)
  }

  private compare(actual: number, condition: string, target: number): boolean {
    switch (condition) {
      case "GREATER_THAN":
      case "CROSSES_ABOVE":
        return actual > target
      case "LESS_THAN":
      case "CROSSES_BELOW":
        return actual < target
      case "EQUALS":
        return Math.abs(actual - target) < 0.01
      default:
        return false
    }
  }

  private async getPrice(signal: SignalRow): Promise<number> {
    const settings = await this.getBrokerSettings(signal.userId)
    if (!settings?.brokerToken) {
      throw new Error(`Брокер не подключён у пользователя ${signal.userId}`)
    }

    const broker = getBrokerProvider()
    await broker.connect(settings.brokerToken)
    return await broker.getCurrentPrice(signal.instrument)
  }

  private async handleTriggered(signal: SignalRow, result: CheckResult) {
    await this.db
      .from("SignalLog")
      .insert({
        signalId: signal.id,
        instrument: signal.instrument,
        message: result.message,
        triggeredAt: new Date().toISOString(),
      })

    await this.db
      .from("Signal")
      .update({
        triggerCount: signal.triggerCount + 1,
        lastTriggered: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", signal.id)

    const { data: user } = await this.db
      .from("User")
      .select("maxChatId, telegramChatId")
      .eq("id", signal.userId)
      .single()

    if (!user) return

    for (const channel of signal.channels) {
      if (channel === "telegram" && user.telegramChatId && this.telegram) {
        try {
          await this.telegram.send(user.telegramChatId, result.message)
        } catch (e) {
          console.error(`[SignalChecker] Telegram send failed for signal ${signal.id}:`, e)
        }
      }
    }
  }

  private async getActiveSignals(): Promise<SignalRow[]> {
    const { data, error } = await this.db
      .from("Signal")
      .select("*")
      .eq("isActive", true)

    if (error) throw new Error(error.message)
    return (data ?? []) as SignalRow[]
  }

  private async getBrokerSettings(userId: string) {
    const { data } = await this.db
      .from("User")
      .select("brokerToken")
      .eq("id", userId)
      .single()
    return data
  }
}
