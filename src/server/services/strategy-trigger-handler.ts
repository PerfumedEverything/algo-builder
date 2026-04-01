import { createAdminClient } from "@/lib/supabase/admin"
import { redis } from "@/lib/redis"
import type { StrategyConfig } from "@/core/types"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { TelegramProvider } from "@/server/providers/notification"
import { OperationService } from "./operation-service"

type TriggerResult = {
  side: "entry" | "exit"
  triggered: boolean
  price?: number
  message: string
}

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}д ${hours}ч`
  if (hours > 0) return `${hours}ч ${minutes}мин`
  return `${minutes}мин`
}

export class StrategyTriggerHandler {
  private _telegram?: TelegramProvider
  private _operationService?: OperationService

  constructor(private db: ReturnType<typeof createAdminClient>) {}

  private get telegram(): TelegramProvider | null {
    if (this._telegram) return this._telegram
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return null
    this._telegram = new TelegramProvider(token)
    return this._telegram
  }

  private get operationService() {
    if (!this._operationService) this._operationService = new OperationService()
    return this._operationService
  }

  async handle(strategy: StrategyRow, result: TriggerResult) {
    const isEntry = result.side === "entry"
    const expectedState = isEntry ? "NONE" : "OPEN"
    const newPositionState = isEntry ? "OPEN" : "NONE"
    const minuteBucket = (Date.now() / 60000) | 0
    const lockKey = `notif:strategy:${strategy.id}:${result.side}:${minuteBucket}`
    const acquired = await redis.set(lockKey, "1", "EX", 120, "NX")
    if (!acquired) return

    let query = this.db.from("Strategy")
      .update({ positionState: newPositionState, updatedAt: new Date().toISOString() })
      .eq("id", strategy.id)
    query = isEntry ? query.eq("positionState", "NONE") : query.eq("positionState", "OPEN")
    const { data: updated } = await query.select("id")
    if (!updated?.length) return

    let recordedQuantity = 0
    let recordedAmount = 0

    if (result.price) {
      try {
        const config = strategy.config as import("@/core/types/strategy").IndicatorStrategyConfig
        const op = await this.operationService.recordOperation({
          strategyId: strategy.id,
          userId: strategy.userId,
          type: isEntry ? "BUY" : "SELL",
          instrument: strategy.instrument,
          price: result.price,
          tradeAmount: config.risks.tradeAmount,
        })
        recordedQuantity = op.quantity
        recordedAmount = op.amount
      } catch (e) {
        console.error(`[StrategyChecker] recordOperation failed, rolling back positionState for strategy ${strategy.id}:`, e)
        try {
          await this.db.from("Strategy").update({ positionState: expectedState, updatedAt: new Date().toISOString() }).eq("id", strategy.id)
        } catch (rollbackErr) {
          console.error(`[CRITICAL] Rollback failed for strategy ${strategy.id}, stuck in state ${newPositionState}:`, rollbackErr)
        }
        return
      }
    }

    let message = result.message

    if (isEntry && recordedQuantity > 0) {
      message += `\n\n📦 Куплено: ${recordedQuantity} лот(ов) на ${recordedAmount.toFixed(2)}₽`
    }

    if (!isEntry && result.price) {
      if (recordedQuantity > 0) {
        message += `\n\n📦 Продано: ${recordedQuantity} лот(ов) на ${recordedAmount.toFixed(2)}₽`
      }
      try {
        const lastBuyOp = await this.operationService.getLastBuyOperation(strategy.id)
        if (lastBuyOp && lastBuyOp.price > 0 && recordedQuantity > 0) {
          const buyPrice = lastBuyOp.price
          const pnlPerShare = result.price - buyPrice
          const totalPnl = pnlPerShare * recordedQuantity
          const pnlPercent = ((pnlPerShare / buyPrice) * 100).toFixed(2)
          const pnlSign = totalPnl >= 0 ? "+" : ""
          message += `\n\n💰 *P&L:* ${pnlSign}${totalPnl.toFixed(2)}₽ (${pnlSign}${pnlPercent}%)`
          message += `\n📊 Вход: ${buyPrice.toFixed(2)}₽ → Выход: ${result.price.toFixed(2)}₽`
          const durationMs = Date.now() - new Date(lastBuyOp.createdAt).getTime()
          message += `\n⏱️ Позиция: ${formatDuration(durationMs)}`
        }
      } catch (e) {
        console.error(`[StrategyChecker] getLastBuyOperation failed for strategy ${strategy.id}:`, e)
      }
    }

    try {
      await this.db.from("StrategyTriggerLog").insert({
        strategyId: strategy.id,
        instrument: strategy.instrument,
        side: result.side,
        price: result.price ?? 0,
        message,
        quantity: recordedQuantity,
        amount: recordedAmount,
        triggeredAt: new Date().toISOString(),
      })
    } catch (e) {
      console.error(`[StrategyChecker] StrategyTriggerLog insert failed for strategy ${strategy.id}:`, e)
    }

    const { data: user } = await this.db.from("User").select("telegramChatId").eq("id", strategy.userId).single()
    if (!user?.telegramChatId || !this.telegram) return
    try {
      await this.telegram.send(user.telegramChatId, message)
    } catch (e) {
      console.error(`[StrategyChecker] Telegram send failed for strategy ${strategy.id}:`, e)
    }
  }
}
