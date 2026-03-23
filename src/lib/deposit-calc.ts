export type RealPnlResult = {
  netDeposits: number
  realPnl: number
  realPnlPercent: number
}

export const calculateRealPnl = (
  totalDeposits: number,
  totalWithdrawals: number,
  portfolioValue: number,
): RealPnlResult => {
  const netDeposits = totalDeposits - totalWithdrawals
  const realPnl = portfolioValue - netDeposits
  const realPnlPercent = netDeposits > 0 ? (realPnl / netDeposits) * 100 : 0
  return { netDeposits, realPnl, realPnlPercent }
}
