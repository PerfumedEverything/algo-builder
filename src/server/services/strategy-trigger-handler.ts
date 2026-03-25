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

    if (result.price) {
      try {
        const config = strategy.config as StrategyConfig
        await this.operationService.recordOperation({
          strategyId: strategy.id,
          userId: strategy.userId,
          type: isEntry ? "BUY" : "SELL",
          instrument: strategy.instrument,
          price: result.price,
          tradeAmount: config.risks.tradeAmount,
        })
      } catch (e) {
        console.error(`[StrategyChecker] recordOperation failed, rolling back positionState for strategy ${strategy.id}:`, e)
        await this.db.from("Strategy").update({ positionState: expectedState, updatedAt: new Date().toISOString() }).eq("id", strategy.id)
        return
      }
    }

    let message = result.message
    if (!isEntry && result.price) {
      try {
        const buyPrice = await this.operationService.getLastBuyPrice(strategy.id)
        if (buyPrice > 0) {
          const pnl = result.price - buyPrice
          const pnlPercent = ((pnl / buyPrice) * 100).toFixed(2)
          const pnlSign = pnl >= 0 ? "+" : ""
          message += `\n\n💰 *P&L:* ${pnlSign}${pnl.toFixed(2)}₽ (${pnlSign}${pnlPercent}%)`
          message += `\n📊 Вход: ${buyPrice.toFixed(2)}₽ → Выход: ${result.price.toFixed(2)}₽`
        }
      } catch (e) {
        console.error(`[StrategyChecker] P&L calc failed for strategy ${strategy.id}:`, e)
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
