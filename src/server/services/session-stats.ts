export type DailySessionStats = {
  sessionOpen: number
  periodOpen: number
  high: number
  low: number
  volume: number
}

export const aggregateSessionStats = (
  candles: { open: number; high: number; low: number; volume: number }[],
): DailySessionStats => {
  if (candles.length === 0) return { sessionOpen: 0, periodOpen: 0, high: 0, low: 0, volume: 0 }
  const sessionOpen = candles[0].open
  return {
    sessionOpen,
    periodOpen: sessionOpen,
    high: Math.max(...candles.map((c) => c.high)),
    low: Math.min(...candles.map((c) => c.low)),
    volume: candles.reduce((sum, c) => sum + c.volume, 0),
  }
}
