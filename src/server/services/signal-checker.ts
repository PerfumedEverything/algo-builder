import { createAdminClient } from "@/lib/supabase/admin"
import type { SignalRow } from "@/server/repositories/signal-repository"
import { getBrokerProvider } from "@/server/providers/broker"
import { formatSignalNotification } from "./notification-templates"
import { PriceCache } from "./price-cache"
import { SignalTriggerHandler } from "./signal-trigger-handler"
import {
  getIndicatorValue, evaluateCondition as coreEval, evaluateConditions, getIndicatorKey, type EvalContext,
} from "./crossing-detector"
import type { SignalCondition } from "@/core/types"
import { cleanTicker } from "@/lib/ticker-utils"

type CheckResult = { signalId: string; signalName: string; instrument: string; triggered: boolean; error?: boolean; message: string }

const H = 60 * 60 * 1000
const candleRangeMs = (i: string) => i === "1h" ? 7 * 24 * H : (i === "1m" || i === "5m" || i === "15m") ? 24 * H : 365 * 24 * H

export class SignalChecker {
  private _db?: ReturnType<typeof createAdminClient>
  private _priceCache?: PriceCache
  private _triggerHandler?: SignalTriggerHandler

  private get db() { if (!this._db) this._db = createAdminClient(); return this._db }
  private get priceCache() { if (!this._priceCache) this._priceCache = new PriceCache(); return this._priceCache }
  private get triggerHandler() { if (!this._triggerHandler) this._triggerHandler = new SignalTriggerHandler(this.db); return this._triggerHandler }

  evaluateCondition(condition: SignalCondition, ctx: EvalContext, lastValues?: Record<string, number>): boolean | null {
    return coreEval(condition, ctx, lastValues)
  }

  async checkAll(): Promise<CheckResult[]> {
    const signals = await this.getActiveSignals()
    const results: CheckResult[] = []
    for (const signal of signals) {
      const locked = await this.priceCache.acquireLock("signal", signal.id)
      if (!locked) { results.push(this.skipResult(signal)); continue }
      try {
        const result = await this.checkSignal(signal)
        results.push(result)
        if (result.triggered) await this.triggerHandler.handle(signal, result)
      } catch (e) { results.push(this.errResult(signal, e)) }
      finally { await this.priceCache.releaseLock("signal", signal.id) }
    }
    return results
  }

  async checkByInstrument(instrumentId: string, price: number): Promise<CheckResult[]> {
    const signals = await this.getActiveSignalsByInstrument(instrumentId)
    const results: CheckResult[] = []
    for (const signal of signals) {
      const locked = await this.priceCache.acquireLock("signal", signal.id)
      if (!locked) { results.push(this.skipResult(signal)); continue }
      try {
        const result = await this.checkSignalWithPrice(signal, price)
        results.push(result)
        if (result.triggered) await this.triggerHandler.handle(signal, result)
      } catch (e) { results.push(this.errResult(signal, e)) }
      finally { await this.priceCache.releaseLock("signal", signal.id) }
    }
    return results
  }

  async checkSignal(signal: SignalRow): Promise<CheckResult> {
    const instrument = cleanTicker(signal.instrument)
    const cached = await this.priceCache.getPrice(instrument)
    const price = cached !== null ? cached : await (await this.connectBroker(signal.userId)).getCurrentPrice(instrument)
    return this.checkSignalWithPrice(signal, price)
  }

  private async checkSignalWithPrice(signal: SignalRow, price: number): Promise<CheckResult> {
    const instrument = cleanTicker(signal.instrument)
    const candles = await this.fetchCandles(signal)
    const ctx: EvalContext = { price, candles }
    const lastValues = (signal.lastIndicatorValues ?? {}) as Record<string, number>
    const allMet = evaluateConditions(signal.conditions, signal.logicOperator ?? "AND", ctx, lastValues)
    await this.persistIndicatorValues(signal, ctx)
    const message = allMet ? formatSignalNotification(signal, ctx) : `${instrument}: not met`
    return { signalId: signal.id, signalName: signal.name, instrument, triggered: allMet, message }
  }

  private async fetchCandles(signal: SignalRow): Promise<EvalContext["candles"]> {
    if (!signal.conditions.some((c) => c.indicator !== "PRICE")) return []
    const instrument = cleanTicker(signal.instrument)
    const interval = signal.timeframe || "1d"
    const cached = await this.priceCache.getCandles(instrument, interval)
    if (cached) return cached.map((c) => ({ ...c, time: new Date(c.time) }))
    const broker = await this.connectBroker(signal.userId)
    const now = new Date()
    const args = { instrumentId: instrument, from: new Date(now.getTime() - candleRangeMs(interval)), to: now, interval }
    try { return await broker.getCandles(args) }
    catch { await new Promise((r) => setTimeout(r, 1000)); return broker.getCandles(args) }
  }

  private async persistIndicatorValues(signal: SignalRow, ctx: EvalContext): Promise<void> {
    const updated = { ...(signal.lastIndicatorValues ?? {}) } as Record<string, number>
    for (const c of signal.conditions) {
      const val = getIndicatorValue(c, ctx)
      if (val !== null) updated[getIndicatorKey(c)] = val
    }
    try {
      await this.db.from("Signal").update({ lastIndicatorValues: updated, updatedAt: new Date().toISOString() }).eq("id", signal.id)
    } catch (e) {
      console.error(`[SignalChecker] Failed to persist lastIndicatorValues for signal ${signal.id}:`, e)
    }
  }

  async getConditionProgress(signal: SignalRow) {
    const instrument = cleanTicker(signal.instrument)
    const cached = await this.priceCache.getPrice(instrument)
    const price = cached !== null ? cached : await (await this.connectBroker(signal.userId)).getCurrentPrice(instrument)
    const ctx: EvalContext = { price, candles: await this.fetchCandles(signal) }
    return signal.conditions.map((c) => {
      const current = getIndicatorValue(c, ctx)
      const met = current !== null ? coreEval(c, ctx) === true : false
      return { indicator: c.indicator, current: current !== null ? Math.round(current * 100) / 100 : null, target: c.value ?? 0, condition: c.condition, met }
    })
  }

  private errResult(signal: SignalRow, e: unknown): CheckResult {
    return { signalId: signal.id, signalName: signal.name, instrument: signal.instrument, triggered: false, error: true, message: `Error: ${e instanceof Error ? e.message : "Unknown"}` }
  }

  private skipResult(signal: SignalRow): CheckResult {
    return { signalId: signal.id, signalName: signal.name, instrument: signal.instrument, triggered: false, message: "Skipped: concurrent check in progress" }
  }

  private async getActiveSignals(): Promise<SignalRow[]> {
    const { data, error } = await this.db.from("Signal").select("*").eq("isActive", true)
    if (error) throw new Error(error.message)
    return (data ?? []) as SignalRow[]
  }

  private async getActiveSignalsByInstrument(instrumentId: string): Promise<SignalRow[]> {
    const { data, error } = await this.db.from("Signal").select("*").eq("isActive", true).eq("instrument", instrumentId)
    if (error) throw new Error(error.message)
    return (data ?? []) as SignalRow[]
  }

  private async connectBroker(userId: string) {
    const { data } = await this.db.from("User").select("brokerToken").eq("id", userId).single()
    if (!data?.brokerToken) throw new Error(`Broker not connected for user ${userId}`)
    const broker = getBrokerProvider()
    await broker.connect(data.brokerToken)
    return broker
  }
}
