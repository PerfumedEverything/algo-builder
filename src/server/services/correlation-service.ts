import { calculateCorrelationMatrix } from "@railpath/finance-toolkit"
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
        batch.map((p) => this.broker.getCandles(userId, { instrumentId: p.instrumentId, from, to: now, interval: "1d" }))
      )
      for (const candles of results) {
        returnsArr.push(candles.length < 2 ? [] : toReturns(candles.map((c) => c.close)))
      }
    }

    const tickers = positions.map((p) => p.ticker)

    const validReturns = returnsArr.filter((r) => r.length >= 5)
    const validTickers = tickers.filter((_, i) => returnsArr[i].length >= 5)
    if (validReturns.length < 2) return { tickers: validTickers, matrix: [], highPairs: [] }

    const minLen = Math.min(...validReturns.map((r) => r.length))
    const trimmed = validReturns.map((r) => r.slice(0, minLen))

    const result = calculateCorrelationMatrix({ returns: trimmed, labels: validTickers })
    const matrix = result.matrix.map((row) => row.map((v) => Math.round(v * 100) / 100))

    const highPairs: CorrelationMatrix["highPairs"] = []
    for (let i = 0; i < validTickers.length; i++) {
      for (let j = i + 1; j < validTickers.length; j++) {
        if (Math.abs(matrix[i][j]) > 0.7) {
          highPairs.push({ a: validTickers[i], b: validTickers[j], corr: matrix[i][j] })
        }
      }
    }

    return { tickers: validTickers, matrix, highPairs }
  }
}
