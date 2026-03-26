export type MOEXCandle = {
  open: number
  close: number
  high: number
  low: number
  value: number
  volume: number
  begin: string
  end: string
}

export type DividendData = {
  secid: string
  isin: string
  registryclosedate: string
  value: number
  currencyid: string
}

export type CorrelationMatrix = {
  tickers: string[]
  matrix: number[][]
  highPairs: { a: string; b: string; corr: number }[]
}

export type SectorAllocation = {
  sector: string
  value: number
  percent: number
  tickers: string[]
}

export type AssetTypeBreakdown = {
  type: string
  label: string
  value: number
  percent: number
  count: number
}

export type ConcentrationIndex = {
  hhi: number
  level: "diversified" | "moderate" | "concentrated"
  dominantPositions: { ticker: string; weight: number }[]
}

export type BenchmarkComparison = {
  portfolioReturn: number
  benchmarkReturn: number
  delta: number
  period: number
}

export type AggregateDividendYield = {
  weightedYield: number
  positionYields: { ticker: string; weight: number; dividendYield: number | null }[]
}

export type InstrumentPnl = {
  ticker: string
  name: string
  totalPnl: number
  strategyCount: number
}

export type TradeSuccessBreakdown = {
  profitable: { count: number; totalPnl: number }
  unprofitable: { count: number; totalPnl: number }
  breakEven: { count: number }
  byInstrument: InstrumentPnl[]
}

export type PortfolioAnalytics = {
  sectorAllocation: SectorAllocation[]
  assetTypeBreakdown: AssetTypeBreakdown[]
  tradeSuccessBreakdown: TradeSuccessBreakdown
  concentration: ConcentrationIndex
  benchmarkComparison: BenchmarkComparison | null
  aggregateDividendYield: AggregateDividendYield
}

export type MarkowitzWeights = {
  ticker: string
  currentWeight: number
  optimalWeight: number
  currentValue: number
}[]

export type RebalancingAction = {
  ticker: string
  action: "BUY" | "SELL" | "HOLD"
  lots: number
  valueRub: number
}

export type MarkowitzResult = {
  weights: MarkowitzWeights
  rebalancingActions: RebalancingAction[]
  expectedReturn: number
  expectedVolatility: number
  sharpe: number
  insufficientData: boolean
}
