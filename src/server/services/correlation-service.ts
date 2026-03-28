import { sampleCorrelation } from "simple-statistics"
import type { CorrelationMatrix } from "@/core/types"
import { AppError } from "@/core/errors/app-error"
import { BrokerService } from "./broker-service"

const toReturns = (closes: number[]) => closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])

export class CorrelationService {
  private broker = new BrokerService()

  async getCorrelationMatrix(userId: string, days = 90): Promise<CorrelationMatrix> {
    const portfolio = await this.broker.getPortfolio(userId)
    if (!portfolio) throw AppError.badRequest("Портфель не найден")

    const positions = portfolio.positions.filter(
      (p) => p.instrumentType === "STOCK" || p.instrumentType === "ETF"
    )
    if (positions.length < 2) return { tickers: positions.map((p) => p.ticker), matrix: [], highPairs: [] }

    const now = new Date()
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const returnsArr: number[][] = []

    for (let i = 0; i < positions.length; i += 3) {
      const batch = positions.slice(i, i + 3)
      const results = await Promise.all(
        batch.map((p) => this.broker.getCandles(userId, { instrumentId: p.instrumentId, from, to: now, interval: "day" }))
      )
      for (const candles of results) {
        returnsArr.push(candles.length < 2 ? [] : toReturns(candles.map((c) => c.close)))
      }
    }

    const tickers = positions.map((p) => p.ticker)
    const n = tickers.length
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    const highPairs: CorrelationMatrix["highPairs"] = []

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1
      for (let j = i + 1; j < n; j++) {
        const minLen = Math.min(returnsArr[i].length, returnsArr[j].length)
        if (minLen < 5) { matrix[i][j] = matrix[j][i] = 0; continue }
        const corr = Math.round(sampleCorrelation(returnsArr[i].slice(0, minLen), returnsArr[j].slice(0, minLen)) * 100) / 100
        matrix[i][j] = matrix[j][i] = corr
        if (Math.abs(corr) > 0.7) highPairs.push({ a: tickers[i], b: tickers[j], corr })
      }
    }

    return { tickers, matrix, highPairs }
  }
}
