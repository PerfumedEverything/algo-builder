export type BrokerAccount = {
  id: string
  name: string
  type: "TINKOFF" | "SANDBOX"
  openedDate: string
}

export type PortfolioPosition = {
  instrumentId: string
  ticker: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  expectedYield: number
  expectedYieldAbsolute: number
  dailyYield: number
  currentValue: number
  instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF"
  blocked: boolean
  blockedLots: number
}

export type Portfolio = {
  totalAmount: number
  expectedYield: number
  expectedYieldAbsolute: number
  dailyYield: number
  dailyYieldRelative: number
  totalShares: number
  totalBonds: number
  totalEtf: number
  totalCurrencies: number
  availableCash: number
  positions: PortfolioPosition[]
}

export type BrokerInstrument = {
  figi: string
  ticker: string
  name: string
  type: "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF"
  currency: string
  lot: number
}

export type CandleParams = {
  instrumentId: string
  from: Date
  to: Date
  interval: string
}

export type Candle = {
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: Date
}

export type BrokerConnectionStatus = "CONNECTED" | "DISCONNECTED" | "ERROR"
