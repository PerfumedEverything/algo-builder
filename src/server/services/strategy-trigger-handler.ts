import { createAdminClient } from "@/lib/supabase/admin"
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
      let buyPrice = 0
      try {
        buyPrice = await this.operationService.getLastBuyPrice(strategy.id)
      } catch {
        try {
          buyPrice = await this.operationService.getLastBuyPrice(strategy.id)
        } catch (e) {
          console.error(`[StrategyChecker] getLastBuyPrice failed after retry for strategy ${strategy.id}:`, e)
        }
      }
      if (buyPrice > 0) {
        const pnlPerShare = result.price - buyPrice
        const quantity = recordedQuantity > 0 ? recordedQuantity : 1
        const totalPnl = pnlPerShare * quantity
        const pnlPercent = ((pnlPerShare / buyPrice) * 100).toFixed(2)
        const pnlSign = totalPnl >= 0 ? "+" : ""
        message += `\n\n💰 *P&L:* ${pnlSign}${totalPnl.toFixed(2)}₽ (${pnlSign}${pnlPercent}%)`
        message += `\n📊 Вход: ${buyPrice.toFixed(2)}₽ → Выход: ${result.price.toFixed(2)}₽`
      }
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
