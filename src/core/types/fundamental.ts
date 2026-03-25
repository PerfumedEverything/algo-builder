export type FundamentalsEntry = {
  pe: number | null
  pb: number | null
  sector: string
  lastUpdated: string
}

export type FundamentalMetrics = {
  pe: number | null
  pb: number | null
  dividendYield: number | null
  score: number
  scoreLabel: "cheap" | "fair" | "expensive"
  lastUpdated: string
  hasFundamentals: boolean
}

export type SectorMedians = Record<string, { pe: number; pb: number }>
