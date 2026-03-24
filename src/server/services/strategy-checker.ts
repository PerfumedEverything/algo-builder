import { createAdminClient } from "@/lib/supabase/admin"
import type { StrategyConfig, LogicOperator, SignalCondition } from "@/core/types"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { getBrokerProvider } from "@/server/providers/broker"
import { TelegramProvider } from "@/server/providers/notification"
import { IndicatorCalculator } from "./indicator-calculator"
import { formatStrategyNotification } from "./notification-templates"
import { PriceCache } from "./price-cache"
import { OperationService } from "./operation-service"

type CheckResult = {
  strategyId: string
  strategyName: string
  instrument: string
  side: "entry" | "exit"
  triggered: boolean
  message: string
  price?: number
}

type EvalContext = {
  price: number
  candles: { open: number; high: number; low: number; close: number; volume: number; time: Date }[]
}

export class StrategyChecker {
  private _telegram?: TelegramProvider
  private _db?: ReturnType<typeof createAdminClient>
  private _priceCache?: PriceCache
  private _operationService?: OperationService

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

  private get priceCache() {
    if (!this._priceCache) this._priceCache = new PriceCache()
    return this._priceCache
  }

  private get operationService() {
    if (!this._operationService) this._operationService = new OperationService()
    return this._operationService
  }

  async checkAll(): Promise<CheckResult[]> {
    const strategies = await this.getActiveStrategies()
    const results: CheckResult[] = []

    for (const strategy of strategies) {
      try {
        const strategyResults = await this.checkStrategy(strategy)
        results.push(...strategyResults)

        for (const result of strategyResults) {
          if (result.triggered) {
            await this.handleTriggered(strategy, result)
          }
        }
      } catch (e) {
        results.push({
          strategyId: strategy.id,
          strategyName: strategy.name,
          instrument: strategy.instrument,
          side: "entry",
          triggered: false,
          message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
        })
      }
    }

    return results
  }

  async checkByInstrument(instrumentId: string, price: number): Promise<CheckResult[]> {
    const strategies = await this.getActiveStrategiesByInstrument(instrumentId)
    const results: CheckResult[] = []

    for (const strategy of strategies) {
      try {
        const strategyResults = await this.checkStrategyWithPrice(strategy, price)
        results.push(...strategyResults)

        for (const result of strategyResults) {
          if (result.triggered) {
            await this.handleTriggered(strategy, result)
          }
        }
      } catch (e) {
        results.push({
          strategyId: strategy.id,
          strategyName: strategy.name,
          instrument: strategy.instrument,
          side: "entry",
          triggered: false,
          message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
        })
      }
    }

    return results
  }

  private async checkStrategy(strategy: StrategyRow): Promise<CheckResult[]> {
    const instrument = strategy.instrument
    const cachedPrice = await this.priceCache.getPrice(instrument)

    let price: number
    if (cachedPrice !== null) {
      price = cachedPrice
    } else {
      const broker = await this.connectBroker(strategy.userId)
      price = await broker.getCurrentPrice(instrument)
    }

    return this.checkStrategyWithPrice(strategy, price)
  }

  private async checkStrategyWithPrice(strategy: StrategyRow, price: number): Promise<CheckResult[]> {
    const config = strategy.config as StrategyConfig
    const positionState = strategy.positionState ?? "NONE"
    const side: "entry" | "exit" = positionState === "OPEN" ? "exit" : "entry"
    const conditions = side === "entry" ? config.entry : config.exit
    const logic = side === "entry" ? (config.entryLogic ?? "AND") : (config.exitLogic ?? "AND")

    if (!conditions?.length) return []

    const needsCandles = conditions.some((c) => c.indicator !== "PRICE")
    let candles: EvalContext["candles"] = []

    if (needsCandles) {
      const interval = strategy.timeframe || "1d"
      const instrumentId = strategy.instrument
      const cached = await this.priceCache.getCandles(instrumentId, interval)

      if (cached) {
        candles = cached.map((c) => ({ ...c, time: new Date(c.time) }))
      } else {
        try {
          const broker = await this.connectBroker(strategy.userId)
          const now = new Date()
          const from = new Date(now.getTime() - getCandleRangeMs(interval))
          candles = await broker.getCandles({
            instrumentId,
            from,
            to: now,
            interval,
          })
        } catch (e) {
          console.error(`[StrategyChecker] getCandles failed for ${instrumentId}:`, e)
          return [{
            strategyId: strategy.id,
            strategyName: strategy.name,
            instrument: strategy.instrument,
            side,
            triggered: false,
            message: `Candle fetch failed for ${instrumentId}: ${e instanceof Error ? e.message : "Unknown error"}`,
          }]
        }
      }

      if (candles.length === 0) {
        return [{
          strategyId: strategy.id,
          strategyName: strategy.name,
          instrument: strategy.instrument,
          side,
          triggered: false,
          message: `Not enough candle data for ${instrumentId}`,
        }]
      }
    }

    const ctx: EvalContext = { price, candles }
    const met = this.evaluateConditions(conditions, logic, ctx)

    return [{
      strategyId: strategy.id,
      strategyName: strategy.name,
      instrument: strategy.instrument,
      side,
      triggered: met,
      price,
      message: met
        ? formatStrategyNotification(strategy, side, ctx)
        : `${strategy.instrument}: ${side} not met`,
    }]
  }

  private evaluateConditions(
    conditions: SignalCondition[],
    logic: LogicOperator,
    ctx: EvalContext,
  ): boolean {
    const results = conditions.map((c) => this.evaluateCondition(c, ctx))
    return logic === "AND" ? results.every(Boolean) : results.some(Boolean)
  }

  private evaluateCondition(condition: SignalCondition, ctx: EvalContext): boolean {
    const actual = this.getIndicatorValue(condition, ctx)
    const target = condition.value ?? 0
    return this.compare(actual, condition.condition, target, ctx.price)
  }

  private getIndicatorValue(condition: SignalCondition, ctx: EvalContext): number {
    const { indicator, params } = condition
    const { price, candles } = ctx

    switch (indicator) {
      case "PRICE":
        return price
      case "RSI":
        return IndicatorCalculator.calculateRSI(candles, params.period ?? 14)
      case "SMA":
        return IndicatorCalculator.calculateSMA(candles, params.period ?? 20)
      case "EMA":
        return IndicatorCalculator.calculateEMA(candles, params.period ?? 20)
      case "MACD": {
        const macd = IndicatorCalculator.calculateMACD(
          candles, params.fast ?? 12, params.slow ?? 26, params.signal ?? 9,
        )
        return macd.macd
      }
      case "BOLLINGER": {
        const bb = IndicatorCalculator.calculateBollinger(candles, params.period ?? 20, params.stdDev ?? 2)
        return bb.upper
      }
      case "VOLUME": {
        const avgVol = IndicatorCalculator.getAverageVolume(candles, params.period ?? 20)
        const currentVol = candles[candles.length - 1]?.volume ?? 0
        return avgVol > 0 ? currentVol / avgVol : 0
      }
      case "PRICE_CHANGE":
        return IndicatorCalculator.getPriceChange(candles, params.period ?? 1)
      case "SUPPORT": {
        const levels = IndicatorCalculator.detectLevels(candles, params.lookback ?? 50)
        return levels.supports.filter((s) => s <= price).sort((a, b) => b - a)[0] ?? 0
      }
      case "RESISTANCE": {
        const levels = IndicatorCalculator.detectLevels(candles, params.lookback ?? 50)
        return levels.resistances.filter((r) => r >= price).sort((a, b) => a - b)[0] ?? Infinity
      }
      default:
        return 0
    }
  }

  private compare(actual: number, condition: string, target: number, currentPrice?: number): boolean {
    switch (condition) {
      case "GREATER_THAN":
      case "CROSSES_ABOVE":
        return actual > target
      case "LESS_THAN":
      case "CROSSES_BELOW":
        return actual < target
      case "EQUALS":
        return Math.abs(actual - target) < 0.01
      case "ABOVE_BY_PERCENT":
        return currentPrice != null && currentPrice > 0 && ((actual - currentPrice) / currentPrice) * 100 >= target
      case "BELOW_BY_PERCENT":
        return currentPrice != null && currentPrice > 0 && ((currentPrice - actual) / currentPrice) * 100 >= target
      case "MULTIPLIED_BY":
        return actual >= target
      default:
        return false
    }
  }

  private async connectBroker(userId: string) {
    const settings = await this.getBrokerSettings(userId)
    if (!settings?.brokerToken) {
      throw new Error(`Broker not connected for user ${userId}`)
    }
    const broker = getBrokerProvider()
    await broker.connect(settings.brokerToken)
    return broker
  }

  private async handleTriggered(strategy: StrategyRow, result: CheckResult) {
    const isEntry = result.side === "entry"
    const expectedState = isEntry ? "NONE" : "OPEN"
    const newPositionState = isEntry ? "OPEN" : "NONE"

    let query = this.db
      .from("Strategy")
      .update({
        positionState: newPositionState,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", strategy.id)

    if (isEntry) {
      query = query.or("positionState.eq.NONE,positionState.is.null")
    } else {
      query = query.eq("positionState", "OPEN")
    }

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
        console.error(`[StrategyChecker] Operation record failed for strategy ${strategy.id}:`, e)
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

    const { data: user } = await this.db
      .from("User")
      .select("telegramChatId")
      .eq("id", strategy.userId)
      .single()

    if (!user?.telegramChatId || !this.telegram) return

    try {
      await this.telegram.send(user.telegramChatId, message)
    } catch (e) {
      console.error(`[StrategyChecker] Telegram send failed for strategy ${strategy.id}:`, e)
    }
  }

  private async getActiveStrategies(): Promise<StrategyRow[]> {
    const { data, error } = await this.db
      .from("Strategy")
      .select("*")
      .eq("status", "ACTIVE")

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyRow[]
  }

  private async getActiveStrategiesByInstrument(instrumentId: string): Promise<StrategyRow[]> {
    const { data, error } = await this.db
      .from("Strategy")
      .select("*")
      .eq("status", "ACTIVE")
      .eq("instrument", instrumentId)

    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyRow[]
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

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const getCandleRangeMs = (interval: string): number => {
  switch (interval) {
    case "1m":
    case "5m":
    case "15m":
      return DAY
    case "1h":
      return 7 * DAY
    default:
      return 365 * DAY
  }
}
