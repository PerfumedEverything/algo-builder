import type { BenchmarkComparison, PortfolioPosition } from "@/core/types"
import { MOEXProvider } from "@/server/providers/analytics/moex-provider"
import { BrokerService } from "./broker-service"

export const getBenchmarkComparison = async (
  userId: string,
  days = 90,
): Promise<BenchmarkComparison | null> => {
  try {
    const broker = new BrokerService()
    const now = new Date()
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const fromStr = from.toISOString().slice(0, 10)
    const tillStr = now.toISOString().slice(0, 10)

    const portfolio = await broker.getPortfolio(userId)
    if (!portfolio || portfolio.positions.length === 0) return null

    const moex = new MOEXProvider()
    const positions: PortfolioPosition[] = portfolio.positions.filter(
      (p) => p.instrumentType === "STOCK" || p.instrumentType === "ETF"
    )
    if (positions.length === 0) return null

    const [imoexCandles, ...positionCandles] = await Promise.all([
      moex.getImoexCandles(fromStr, tillStr),
      ...positions.slice(0, 10).map((p) =>
        broker.getCandles(userId, { instrumentId: p.instrumentId, from, to: now, interval: "day" }).catch(() => [])
      ),
    ])

    if (imoexCandles.length < 2) return null

    let pastValue = 0
    let currentValue = 0
    for (let i = 0; i < Math.min(positions.length, 10); i++) {
      const pos = positions[i]
      const candles = positionCandles[i]
      const startClose = candles.length > 0 ? candles[0].close : pos.currentPrice
      pastValue += pos.quantity * startClose
      currentValue += pos.quantity * pos.currentPrice
    }

    const portfolioReturn = pastValue > 0 ? ((currentValue - pastValue) / pastValue) * 100 : 0
    const startPrice = imoexCandles[0].close
    const endPrice = imoexCandles[imoexCandles.length - 1].close
    const benchmarkReturn = ((endPrice - startPrice) / startPrice) * 100

    return {
      portfolioReturn: Math.round(portfolioReturn * 100) / 100,
      benchmarkReturn: Math.round(benchmarkReturn * 100) / 100,
      delta: Math.round((portfolioReturn - benchmarkReturn) * 100) / 100,
      period: days,
    }
  } catch {
    return null
  }
}
