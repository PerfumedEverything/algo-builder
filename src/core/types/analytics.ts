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

export type TradeSuccessBreakdown = {
  profitable: { count: number; totalPnl: number }
  unprofitable: { count: number; totalPnl: number }
}

export type PortfolioAnalytics = {
  sectorAllocation: SectorAllocation[]
  assetTypeBreakdown: AssetTypeBreakdown[]
  tradeSuccessBreakdown: TradeSuccessBreakdown
}
