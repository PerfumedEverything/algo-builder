import { addExchangeSchema, setConfig } from "backtest-kit"
import { getBrokerProvider } from "@/server/providers/broker"

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
    throw new Error("Not implemented — requires backtest-kit Backtest API integration")
  }
}
