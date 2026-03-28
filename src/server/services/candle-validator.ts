import type { Candle } from "@/core/types"

export const validateOHLC = (c: Candle): boolean => {
  if (c.high < c.low) return false
  if (c.high < c.open || c.high < c.close) return false
  if (c.low > c.open || c.low > c.close) return false
  if (c.volume < 0) return false
  if (c.time > new Date()) return false
  return true
}

export const filterValidCandles = (candles: Candle[]): Candle[] =>
  candles.filter((c) => {
    if (!validateOHLC(c)) {
      console.warn("[CandleValidator] filtered broken candle", {
        time: c.time,
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        v: c.volume,
      })
      return false
    }
    return true
  })
