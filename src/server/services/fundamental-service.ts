import { FUNDAMENTALS_MAP, SECTOR_PE_MEDIANS } from "@/core/data/fundamentals-map"
import type { FundamentalMetrics, FundamentalsEntry } from "@/core/types"
import type { MOEXProvider as IMOEXProvider } from "@/server/providers/analytics/moex-provider"
import { MOEXProvider } from "@/server/providers/analytics/moex-provider"

export class FundamentalService {
  private moex: IMOEXProvider

  constructor(moex?: IMOEXProvider) {
    this.moex = moex ?? new MOEXProvider()
  }

  async getMetrics(ticker: string, currentPrice: number): Promise<FundamentalMetrics> {
    const entry = FUNDAMENTALS_MAP[ticker]

    if (!entry) {
      return {
        pe: null,
        pb: null,
        dividendYield: null,
        score: 5,
        scoreLabel: "fair",
        lastUpdated: "",
        hasFundamentals: false,
      }
    }

    const dividendYield = await this.calculateDividendYield(ticker, currentPrice)
    const score = this.calculateScore(entry.pe, entry.pb, dividendYield, entry.sector)
    const scoreLabel = score <= 4 ? "cheap" : score <= 6 ? "fair" : "expensive"

    return {
      pe: entry.pe,
      pb: entry.pb,
      dividendYield,
      score,
      scoreLabel,
      lastUpdated: entry.lastUpdated,
      hasFundamentals: true,
    }
  }

  private async calculateDividendYield(ticker: string, currentPrice: number): Promise<number | null> {
    if (currentPrice <= 0) return null
    try {
      const dividends = await this.moex.getDividends(ticker)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const recent = dividends.filter((d) => new Date(d.registryclosedate) >= oneYearAgo)
      if (recent.length === 0) return null
      const totalDivPerShare = recent.reduce((sum, d) => sum + d.value, 0)
      return (totalDivPerShare / currentPrice) * 100
    } catch {
      return null
    }
  }

  calculateScore(pe: number | null, pb: number | null, dividendYield: number | null, sector: string): number {
    const medians = SECTOR_PE_MEDIANS[sector] ?? SECTOR_PE_MEDIANS.default
    let totalWeight = 0
    let weightedScore = 0

    if (pe !== null) {
      const peRatio = pe / medians.pe
      const peScore = Math.min(10, Math.max(1, Math.round(peRatio * 5)))
      weightedScore += peScore * 0.4
      totalWeight += 0.4
    }

    if (pb !== null) {
      const pbRatio = pb / medians.pb
      const pbScore = Math.min(10, Math.max(1, Math.round(pbRatio * 5)))
      weightedScore += pbScore * 0.3
      totalWeight += 0.3
    }

    if (dividendYield !== null) {
      const divScore = dividendYield >= 8 ? 2 : dividendYield >= 4 ? 4 : dividendYield > 0 ? 7 : 9
      weightedScore += divScore * 0.3
      totalWeight += 0.3
    }

    if (totalWeight === 0) return 5
    return Math.max(1, Math.min(10, Math.round(weightedScore / totalWeight)))
  }
}
