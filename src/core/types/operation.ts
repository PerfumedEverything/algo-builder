export type OperationType = "BUY" | "SELL"

export type StrategyOperation = {
  id: string
  strategyId: string
  userId: string
  type: OperationType
  instrument: string
  price: number
  quantity: number
  amount: number
  createdAt: string
}

export type OperationStats = {
  totalOperations: number
  buyCount: number
  sellCount: number
  initialAmount: number
  currentAmount: number
  holdingQty: number
  pnl: number
  pnlPercent: number
  lastBuyPrice: number
}
