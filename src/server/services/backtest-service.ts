import { addExchangeSchema, addStrategySchema, setConfig, Backtest } from "backtest-kit"
import type { IStrategyTickResultClosed } from "backtest-kit"
import { getBrokerProvider } from "@/server/providers/broker"
import type { StrategyCondition, LogicOperator, StrategyRisks } from "@/core/types"

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
        const broker = getBrokerProvider()
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

    const risks = entryPayload.risks ?? {}
    const tpPct = risks.takeProfit ?? 3
    const slPct = risks.stopLoss ?? 1.5

    addStrategySchema({
      strategyName: name,
      interval,
      getSignal: async (_symbol: string, _when: Date) => {
        return {
          position: "long" as const,
          priceTakeProfit: 1 + tpPct / 100,
          priceStopLoss: 1 - slPct / 100,
          minuteEstimatedTime: Infinity,
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
