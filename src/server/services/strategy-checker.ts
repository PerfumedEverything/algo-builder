import { createAdminClient } from "@/lib/supabase/admin"
import type { StrategyConfig } from "@/core/types"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { getBrokerProvider } from "@/server/providers/broker"
import { formatStrategyNotification } from "./notification-templates"
import { PriceCache } from "./price-cache"
import { StrategyTriggerHandler } from "./strategy-trigger-handler"
import { evaluateConditions, getIndicatorValue, getIndicatorKey, type EvalContext } from "./crossing-detector"
import { cleanTicker } from "@/lib/ticker-utils"

type CheckResult = {
  strategyId: string
  strategyName: string
  instrument: string
  side: "entry" | "exit"
  triggered: boolean
  error?: boolean
  message: string
  price?: number
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const getCandleRangeMs = (i: string) => ({ "1m": 7 * DAY, "5m": 14 * DAY, "15m": 30 * DAY, "1h": 60 * DAY })[i] ?? 365 * DAY

const errResult = (s: StrategyRow, e: unknown): CheckResult => ({
  strategyId: s.id, strategyName: s.name, instrument: s.instrument,
  side: "entry", triggered: false, error: true,
  message: `Error: ${e instanceof Error ? e.message : "Unknown"}`,
})

export class StrategyChecker {
  private _db?: ReturnType<typeof createAdminClient>
  private _priceCache?: PriceCache
  private _triggerHandler?: StrategyTriggerHandler

  private get db() {
    if (!this._db) this._db = createAdminClient()
    return this._db
  }

  private get priceCache() {
    if (!this._priceCache) this._priceCache = new PriceCache()
    return this._priceCache
  }

  private get triggerHandler() {
    if (!this._triggerHandler) this._triggerHandler = new StrategyTriggerHandler(this.db)
    return this._triggerHandler
  }

  async checkAll(): Promise<CheckResult[]> {
    const strategies = await this.getActiveStrategies()
    const results: CheckResult[] = []
    for (const strategy of strategies) {
      if (!await this.priceCache.acquireLock("strategy", strategy.id)) continue
      try {
        const r = await this.checkStrategy(strategy)
        results.push(...r)
        for (const res of r) { if (res.triggered) await this.triggerHandler.handle(strategy, res) }
      } catch (e) { results.push(errResult(strategy, e)) }
      finally { await this.priceCache.releaseLock("strategy", strategy.id) }
    }
    return results
  }

  async checkByInstrument(instrumentId: string, price: number): Promise<CheckResult[]> {
    const strategies = await this.getActiveStrategiesByInstrument(instrumentId)
    const results: CheckResult[] = []
    for (const strategy of strategies) {
      if (!await this.priceCache.acquireLock("strategy", strategy.id)) continue
      try {
        const r = await this.checkStrategyWithPrice(strategy, price)
        results.push(...r)
        for (const res of r) { if (res.triggered) await this.triggerHandler.handle(strategy, res) }
      } catch (e) { results.push(errResult(strategy, e)) }
      finally { await this.priceCache.releaseLock("strategy", strategy.id) }
    }
    return results
  }

  private async checkStrategy(strategy: StrategyRow): Promise<CheckResult[]> {
    const instrument = cleanTicker(strategy.instrument)
    const broker = await this.connectBroker(strategy.userId)
    const price = await broker.getCurrentPrice(instrument)
    return this.checkStrategyWithPrice(strategy, price)
  }

  private async checkStrategyWithPrice(strategy: StrategyRow, price: number): Promise<CheckResult[]> {
    const instrument = cleanTicker(strategy.instrument)
    const config = strategy.config as StrategyConfig
    const side: "entry" | "exit" = (strategy.positionState ?? "NONE") === "OPEN" ? "exit" : "entry"
    const conditions = side === "entry" ? config.entry : config.exit
    const logic = side === "entry" ? (config.entryLogic ?? "AND") : (config.exitLogic ?? "AND")
    if (!conditions?.length) return []

    let candles: EvalContext["candles"] = []
    if (conditions.some((c) => c.indicator !== "PRICE")) {
      const interval = strategy.timeframe || "5m"
      const cached = await this.priceCache.getCandles(instrument, interval)
      if (cached) {
        candles = cached.map((c) => ({ ...c, time: new Date(c.time) }))
      } else {
        const broker = await this.connectBroker(strategy.userId)
        const now = new Date()
        const from = new Date(now.getTime() - getCandleRangeMs(interval))
        try {
          candles = await broker.getCandles({ instrumentId: instrument, from, to: now, interval })
        } catch {
          await new Promise((r) => setTimeout(r, 1000))
          candles = await broker.getCandles({ instrumentId: instrument, from, to: now, interval })
        }
      }
      if (!candles.length) return [{ strategyId: strategy.id, strategyName: strategy.name, instrument, side, triggered: false, message: `Not enough candle data for ${instrument}` }]
    }

    const ctx: EvalContext = { price, candles }
    const lastValues = (strategy.lastIndicatorValues ?? {}) as Record<string, number>
    const met = await evaluateConditions(conditions, logic, ctx, lastValues)

    const updatedValues = { ...lastValues }
    for (const c of conditions) { const v = getIndicatorValue(c, ctx); if (v !== null) updatedValues[getIndicatorKey(c)] = v }
    try {
      await this.db.from("Strategy").update({ lastIndicatorValues: updatedValues, updatedAt: new Date().toISOString() }).eq("id", strategy.id)
    } catch (e) {
      console.error(`[StrategyChecker] Failed to persist lastIndicatorValues for strategy ${strategy.id}:`, e)
    }

    return [{ strategyId: strategy.id, strategyName: strategy.name, instrument, side, triggered: met, price, message: met ? formatStrategyNotification(strategy, side, ctx) : `${instrument}: ${side} not met` }]
  }

  private async getActiveStrategies(): Promise<StrategyRow[]> {
    const { data, error } = await this.db.from("Strategy").select("*").eq("status", "ACTIVE")
    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyRow[]
  }

  private async getActiveStrategiesByInstrument(instrumentId: string): Promise<StrategyRow[]> {
    const { data, error } = await this.db.from("Strategy").select("*").eq("status", "ACTIVE").eq("instrument", instrumentId)
    if (error) throw new Error(error.message)
    return (data ?? []) as StrategyRow[]
  }

  private async connectBroker(userId: string) {
    const { data } = await this.db.from("User").select("brokerToken").eq("id", userId).single()
    if (!data?.brokerToken) throw new Error(`Broker not connected for user ${userId}`)
    const broker = getBrokerProvider()
    await broker.connect(data.brokerToken)
    return broker
  }
}
