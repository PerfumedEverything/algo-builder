import type { AggregateDividendYield, PortfolioPosition } from "@/core/types"
import { MOEXProvider } from "@/server/providers/analytics/moex-provider"

export const getAggregateDividendYield = async (
  positions: PortfolioPosition[],
): Promise<AggregateDividendYield> => {
  const totalValue = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0)
  if (totalValue <= 0) return { weightedYield: 0, positionYields: [] }

  const moex = new MOEXProvider()
  const results: { ticker: string; weight: number; dividendYield: number | null }[] = []

  for (let i = 0; i < positions.length; i += 5) {
    const batch = positions.slice(i, i + 5)
    const batchResults = await Promise.all(
      batch.map(async (pos) => {
        const weight = (pos.quantity * pos.currentPrice) / totalValue
        try {
          const dividends = await moex.getDividends(pos.ticker)
          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
          const recent = dividends.filter(d => new Date(d.registryclosedate) >= oneYearAgo)
          if (recent.length === 0 || pos.currentPrice <= 0) {
            return { ticker: pos.ticker, weight, dividendYield: null as number | null }
          }
          const totalDiv = recent.reduce((sum, d) => sum + d.value, 0)
          const dy = (totalDiv / pos.currentPrice) * 100
          return { ticker: pos.ticker, weight, dividendYield: Math.round(dy * 100) / 100 }
        } catch {
          return { ticker: pos.ticker, weight, dividendYield: null as number | null }
        }
      })
    )
    results.push(...batchResults)
  }

  let weightedYield = 0
  for (const r of results) {
    if (r.dividendYield !== null) weightedYield += r.weight * r.dividendYield
  }

  return { weightedYield: Math.round(weightedYield * 100) / 100, positionYields: results }
}
