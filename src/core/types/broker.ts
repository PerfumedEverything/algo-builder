export type BrokerAccount = {
  id: string
  name: string
  type: "TINKOFF" | "SANDBOX" | "BYBIT"
  openedDate: string
}

export type PlaceOrderParams = {
  symbol: string
  side: "BUY" | "SELL"
  orderType: "MARKET" | "LIMIT"
  quantity: number
  price?: number
  accountId: string
}

export type PositionOperation = {
  id: string
  type: "BUY" | "SELL"
  price: number
  quantity: number
  amount: number
  date: string
}

export type PositionLot = {
  buyDate: string
  buyPrice: number
  quantity: number
  remainingQuantity: number
  currentPrice: number
  pnl: number
  pnlPercent: number
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
  instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF" | "CRYPTO"
  blocked: boolean
  blockedLots: number
  operations: PositionOperation[]
  lots?: PositionLot[]
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
  type: "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF" | "CRYPTO"
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
