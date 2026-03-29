export type GridDistribution = 'ARITHMETIC' | 'GEOMETRIC'

export type GridConfig = {
  type: 'GRID'
  lowerPrice: number
  upperPrice: number
  gridLevels: number
  amountPerOrder: number
  gridDistribution: GridDistribution
  stopLoss?: number
  takeProfit?: number
  feeRate: number
}

export type GridOrderSide = 'BUY' | 'SELL'
export type GridOrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED'

export type GridLevel = {
  index: number
  price: number
  side: GridOrderSide
  status: GridOrderStatus
  filledAt?: Date
  filledPrice?: number
  quantity: number
  pnlDelta?: number
}

export type GridState = {
  levels: GridLevel[]
  realizedPnl: number
  totalBuys: number
  totalSells: number
  isActive: boolean
  outOfRange: boolean
}

export type GridTickResult = {
  filledOrders: GridLevel[]
  newCounterOrders: GridLevel[]
  pnlDelta: number
  isOutOfRange: boolean
}
