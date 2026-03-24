import { createAdminClient } from "@/lib/supabase/admin"
import type { SignalCondition, LogicOperator } from "@/core/types"
import type { SignalRow } from "@/server/repositories/signal-repository"
import { getBrokerProvider } from "@/server/providers/broker"
import { TelegramProvider } from "@/server/providers/notification"
import { IndicatorCalculator } from "./indicator-calculator"
import { formatSignalNotification } from "./notification-templates"
import { PriceCache } from "./price-cache"

type CheckResult = {
  signalId: string
  signalName: string
  instrument: string
  triggered: boolean
  message: string
}

type EvalContext = {
  price: number
  candles: { open: number; high: number; low: number; close: number; volume: number; time: Date }[]
}

export class SignalChecker {
  private _telegram?: TelegramProvider
  private _db?: ReturnType<typeof createAdminClient>
  private _priceCache?: PriceCache

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

  async checkByInstrument(instrumentId: string, price: number): Promise<CheckResult[]> {
    const signals = await this.getActiveSignalsByInstrument(instrumentId)
    const results: CheckResult[] = []

    for (const signal of signals) {
      try {
        const result = await this.checkSignalWithPrice(signal, price)
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
    const cachedPrice = await this.priceCache.getPrice(signal.instrument)

    let price: number
    if (cachedPrice !== null) {
      price = cachedPrice
    } else {
      const broker = await this.connectBroker(signal.userId)
      price = await broker.getCurrentPrice(signal.instrument)
    }

    return this.checkSignalWithPrice(signal, price)
  }

  private async checkSignalWithPrice(signal: SignalRow, price: number): Promise<CheckResult> {
    const needsCandles = signal.conditions.some((c) => c.indicator !== "PRICE")
    let candles: EvalContext["candles"] = []

    if (needsCandles) {
      const interval = signal.timeframe || "1d"
      const cached = await this.priceCache.getCandles(signal.instrument, interval)

      if (cached) {
        candles = cached.map((c) => ({ ...c, time: new Date(c.time) }))
      } else {
        const broker = await this.connectBroker(signal.userId)
        const now = new Date()
        const from = new Date(now.getTime() - getCandleRangeMs(interval))
        candles = await broker.getCandles({
          instrumentId: signal.instrument,
          from,
          to: now,
          interval,
        })
      }
    }

    const ctx: EvalContext = { price, candles }
    const logic: LogicOperator = signal.logicOperator ?? "AND"

    const conditionResults = signal.conditions.map((c) => this.evaluateCondition(c, ctx))
    const allMet = logic === "AND"
      ? conditionResults.every(Boolean)
      : conditionResults.some(Boolean)

    const message = allMet
      ? formatSignalNotification(signal, ctx)
      : `${signal.instrument}: not met`

    return {
      signalId: signal.id,
      signalName: signal.name,
      instrument: signal.instrument,
      triggered: allMet,
      message,
    }
  }

  async getConditionProgress(signal: SignalRow) {
    const cachedPrice = await this.priceCache.getPrice(signal.instrument)

    let price: number
    if (cachedPrice !== null) {
      price = cachedPrice
    } else {
      const broker = await this.connectBroker(signal.userId)
      price = await broker.getCurrentPrice(signal.instrument)
    }

    const needsCandles = signal.conditions.some((c) => c.indicator !== "PRICE")
    let candles: EvalContext["candles"] = []

    if (needsCandles) {
      const interval = signal.timeframe || "1d"
      const cached = await this.priceCache.getCandles(signal.instrument, interval)

      if (cached) {
        candles = cached.map((c) => ({ ...c, time: new Date(c.time) }))
      } else {
        const broker = await this.connectBroker(signal.userId)
        const now = new Date()
        const from = new Date(now.getTime() - getCandleRangeMs(interval))
        candles = await broker.getCandles({
          instrumentId: signal.instrument,
          from,
          to: now,
          interval,
        })
      }
    }

    const ctx: EvalContext = { price, candles }

    return signal.conditions.map((c) => {
      const current = this.getIndicatorValue(c, ctx)
      const target = c.value ?? 0
      const met = this.compare(current, c.condition, target, price)
      return {
        indicator: c.indicator,
        current: Math.round(current * 100) / 100,
        target,
        condition: c.condition,
        met,
      }
    })
  }

  evaluateCondition(condition: SignalCondition, ctx: EvalContext): boolean {
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
          candles,
          params.fast ?? 12,
          params.slow ?? 26,
          params.signal ?? 9,
        )
        return macd.macd
      }

      case "BOLLINGER": {
        const bb = IndicatorCalculator.calculateBollinger(
          candles,
          params.period ?? 20,
          params.stdDev ?? 2,
        )
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
        const nearestSupport = levels.supports
          .filter((s) => s <= price)
          .sort((a, b) => b - a)[0]
        return nearestSupport ?? 0
      }

      case "RESISTANCE": {
        const levels = IndicatorCalculator.detectLevels(candles, params.lookback ?? 50)
        const nearestResistance = levels.resistances
          .filter((r) => r >= price)
          .sort((a, b) => a - b)[0]
        return nearestResistance ?? Infinity
      }

      default:
        return 0
    }
  }

  private compare(
    actual: number,
    condition: string,
    target: number,
    currentPrice?: number,
  ): boolean {
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

  private async handleTriggered(signal: SignalRow, result: CheckResult) {
    const { data: updated } = await this.db
      .from("Signal")
      .update({
        triggerCount: signal.triggerCount + 1,
        lastTriggered: new Date().toISOString(),
        isActive: signal.repeatMode ? true : false,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", signal.id)
      .eq("triggerCount", signal.triggerCount)
      .select("id")

    if (!updated?.length) return

    await this.db
      .from("SignalLog")
      .insert({
        signalId: signal.id,
        instrument: signal.instrument,
        message: result.message,
        triggeredAt: new Date().toISOString(),
      })

    const { data: user } = await this.db
      .from("User")
      .select("telegramChatId")
      .eq("id", signal.userId)
      .single()

    if (!user) return

    const uniqueChannels = [...new Set(signal.channels)]
    for (const channel of uniqueChannels) {
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

  private async getActiveSignalsByInstrument(instrumentId: string): Promise<SignalRow[]> {
    const { data, error } = await this.db
      .from("Signal")
      .select("*")
      .eq("isActive", true)
      .eq("instrument", instrumentId)

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
