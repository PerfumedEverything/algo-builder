export type OrderBookLevel = {
  price: number
  quantity: number
}

export type OrderBookData = {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
}

export type TopMover = {
  ticker: string
  shortName: string
  price: number
  changePct: number
  volume: number
  high: number
  low: number
}

export type PriceUpdate = {
  instrumentId: string
  price: number
  updatedAt: number
}
