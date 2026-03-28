import { addExchangeSchema, addStrategySchema, setConfig, Backtest } from "backtest-kit"
import type { IStrategyTickResultClosed } from "backtest-kit"
import { TinkoffProvider } from "@/server/providers/broker"
import type { StrategyCondition, LogicOperator, StrategyRisks } from "@/core/types"
import { evaluateBacktestConditions } from "./evaluate-conditions"
import { IndicatorCalculator } from "./indicator-calculator"
import { filterValidCandles } from "./candle-validator"
import type { Candle } from "@/core/types"

export type BacktestResult = {
  totalTrades: number
  winRate: number
  totalPnl: number
  maxDrawdown: number
  sharpeRatio: number
  startDate: Date
  endDate: Date
}

export type BacktestParams = {
  instrumentId: string
  interval: string
  fromDate: Date
  toDate: Date
  entryConditions: string
  exitConditions: string
  positionSize: number
}

type ConditionsPayload = {
  conditions: StrategyCondition[]
  logic: LogicOperator
  risks?: StrategyRisks
}

const VALID_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h"] as const
type SignalInterval = (typeof VALID_INTERVALS)[number]

function toSignalInterval(interval: string): SignalInterval {
  return VALID_INTERVALS.includes(interval as SignalInterval)
    ? (interval as SignalInterval)
    : "1h"
}

function calcMaxDrawdown(signalList: IStrategyTickResultClosed[]): number {
  let peak = 0
  let cumulative = 0
  let maxDrawdown = 0

  for (const s of signalList) {
    cumulative += s.pnl.pnlPercentage
    if (cumulative > peak) peak = cumulative
    const drawdown = peak - cumulative
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  return maxDrawdown
}

function computeIndicators(candles: Candle[], conditions: StrategyCondition[]): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const cond of conditions) {
    if (cond.indicator === "PRICE") continue
    const period = cond.params.period ?? 14
    const key = `${cond.indicator}_${period}`
    if (key in result) continue

    switch (cond.indicator) {
      case "RSI":
        result[key] = IndicatorCalculator.calculateRSI(candles, period)
        break
      case "SMA":
        result[key] = IndicatorCalculator.calculateSMA(candles, period)
        break
      case "EMA":
        result[key] = IndicatorCalculator.calculateEMA(candles, period)
        break
      case "ATR":
        result[key] = IndicatorCalculator.calculateATR(candles, period)
        break
      case "STOCHASTIC":
        result[key] = IndicatorCalculator.calculateStochastic(candles, period)
        break
      case "WILLIAMS_R":
        result[key] = IndicatorCalculator.calculateWilliamsR(candles, period)
        break
      case "VWAP":
        result[key] = IndicatorCalculator.calculateVWAP(candles)
        break
      default:
        result[key] = null
    }
  }
  return result
}

export class BacktestService {
  private static initialized = false

  static initialize(): void {
    if (this.initialized) return

    setConfig({
      CC_PERCENT_SLIPPAGE: 0.05,
      CC_PERCENT_FEE: 0.03,
    })

    addExchangeSchema({
      exchangeName: "tinkoff-moex",
      getCandles: async (symbol: string, interval: string, since: Date, limit: number) => {
        const broker = new TinkoffProvider()
        const to = new Date()
        const candles = await broker.getCandles({
          instrumentId: symbol,
          interval,
          from: since,
          to,
        })
        return candles.slice(0, limit).map((c) => ({
          timestamp: c.time.getTime(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }))
      },
    })

    this.initialized = true
  }

  static isInitialized(): boolean {
    return this.initialized
  }

  static async runBacktest(params: BacktestParams): Promise<BacktestResult> {
    if (!this.initialized) this.initialize()

    const name = `bt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const interval = toSignalInterval(params.interval)

    let entryPayload: ConditionsPayload = { conditions: [], logic: "AND", risks: {} }
    try {
      entryPayload = JSON.parse(params.entryConditions) as ConditionsPayload
    } catch {}

    let exitPayload: ConditionsPayload = { conditions: [], logic: "OR" }
    try {
      exitPayload = JSON.parse(params.exitConditions) as ConditionsPayload
    } catch {}

    const risks = entryPayload.risks ?? {}
    const tpPct = risks.takeProfit ?? 3
    const slPct = risks.stopLoss ?? 1.5

    const broker = new TinkoffProvider()
    const rawCandles = await broker.getCandles({
      instrumentId: params.instrumentId,
      interval: params.interval,
      from: params.fromDate,
      to: params.toDate,
    })
    const allCandles = filterValidCandles(rawCandles)

    const allConditions = [...entryPayload.conditions, ...exitPayload.conditions]
    let inPosition = false

    addStrategySchema({
      strategyName: name,
      interval,
      getSignal: async (_symbol: string, when: Date) => {
        if (entryPayload.conditions.length === 0) return null

        const windowEnd = allCandles.findLastIndex((c) => c.time <= when)
        if (windowEnd < 0) return null

        const window = allCandles.slice(0, windowEnd + 1)
        const currentCandle = window[window.length - 1]
        const indicators = computeIndicators(window, allConditions)

        if (!inPosition) {
          const entryMet = evaluateBacktestConditions(
            entryPayload.conditions,
            entryPayload.logic ?? "AND",
            indicators,
            currentCandle.close,
          )
          if (!entryMet) return null

          inPosition = true
          return {
            position: "long" as const,
            priceTakeProfit: 1 + tpPct / 100,
            priceStopLoss: 1 - slPct / 100,
            minuteEstimatedTime: Infinity,
          }
        } else {
          if (exitPayload.conditions.length > 0) {
            const exitMet = evaluateBacktestConditions(
              exitPayload.conditions,
              "OR",
              indicators,
              currentCandle.close,
            )
            if (exitMet) {
              inPosition = false
              return null
            }
          }
          return null
        }
      },
    })

    const context = { strategyName: name, exchangeName: "tinkoff-moex", frameName: "backtest" }

    for await (const _ of Backtest.run(params.instrumentId, context)) {
    }

    const stats = await Backtest.getData(params.instrumentId, context)

    return {
      totalTrades: stats.totalSignals,
      winRate: stats.winRate ?? 0,
      totalPnl: stats.totalPnl ?? 0,
      sharpeRatio: stats.sharpeRatio ?? 0,
      maxDrawdown: calcMaxDrawdown(stats.signalList),
      startDate: params.fromDate,
      endDate: params.toDate,
    }
  }
}
