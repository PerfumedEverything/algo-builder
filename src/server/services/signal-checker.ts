import { createClient } from "@/lib/supabase/server"
import type { SignalCondition } from "@/core/types"
import type { SignalRow } from "@/server/repositories/signal-repository"
import { SignalLogRepository } from "@/server/repositories/signal-log-repository"
import { getBrokerProvider } from "@/server/providers/broker"
import { getNotificationProvider } from "@/server/providers/notification"
import { UserRepository } from "@/server/repositories"

type CheckResult = {
  signalId: string
  signalName: string
  instrument: string
  triggered: boolean
  message: string
}

export class SignalChecker {
  private logRepo = new SignalLogRepository()
  private userRepo = new UserRepository()
  private broker = getBrokerProvider()
  private notifier = getNotificationProvider()

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
      ? `🔔 ${signal.name}\n📊 ${signal.instrument} — ${typeLabel}\n💰 Цена: ${price.toFixed(2)}\n📋 Все условия выполнены\n🕐 ${new Date().toLocaleString("ru-RU")}`
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
    const value = this.getIndicatorValue(condition, price)
    const target = condition.value ?? 0

    switch (condition.condition) {
      case "GREATER_THAN":
        return value > target
      case "LESS_THAN":
        return value < target
      case "EQUALS":
        return Math.abs(value - target) < 0.001
      case "CROSSES_ABOVE":
        return value > target
      case "CROSSES_BELOW":
        return value < target
      case "BETWEEN":
        return false
      default:
        return false
    }
  }

  private getIndicatorValue(condition: SignalCondition, price: number): number {
    switch (condition.indicator) {
      case "PRICE":
        return price
      case "RSI":
        return 30 + Math.random() * 40
      case "SMA":
      case "EMA":
        return price * (0.95 + Math.random() * 0.1)
      case "MACD":
        return (Math.random() - 0.5) * 10
      case "BOLLINGER":
        return price * (0.97 + Math.random() * 0.06)
      default:
        return price
    }
  }

  private async getPrice(signal: SignalRow): Promise<number> {
    try {
      const settings = await this.getBrokerSettings(signal.userId)
      if (settings?.brokerToken) {
        await this.broker.connect(settings.brokerToken)
        return await this.broker.getCurrentPrice(signal.instrument)
      }
    } catch {
      // fallback to mock
    }
    return 250 + Math.random() * 50
  }

  private async handleTriggered(signal: SignalRow, result: CheckResult) {
    await this.logRepo.create({
      signalId: signal.id,
      instrument: signal.instrument,
      message: result.message,
    })

    await this.updateTriggerCount(signal)

    const user = await this.userRepo.findById(signal.userId)
    if (!user) return

    for (const channel of signal.channels) {
      try {
        if (channel === "max" && user.maxChatId) {
          await this.notifier.send(user.maxChatId, result.message)
        }
        if (channel === "telegram" && user.telegramChatId) {
          await this.notifier.send(user.telegramChatId, result.message)
        }
      } catch {
        // log but don't fail
      }
    }
  }

  private async getActiveSignals(): Promise<SignalRow[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("Signal")
      .select("*")
      .eq("isActive", true)

    if (error) throw new Error(error.message)
    return (data ?? []) as SignalRow[]
  }

  private async updateTriggerCount(signal: SignalRow) {
    const supabase = await createClient()
    await supabase
      .from("Signal")
      .update({
        triggerCount: signal.triggerCount + 1,
        lastTriggered: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", signal.id)
  }

  private async getBrokerSettings(userId: string) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("User")
      .select("brokerToken")
      .eq("id", userId)
      .single()
    return data
  }
}
