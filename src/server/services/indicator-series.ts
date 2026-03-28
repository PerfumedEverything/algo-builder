import { RSI, SMA, EMA, MACD, StochasticOscillator, WilliamsR } from "trading-signals"
import type { Candle } from "@/core/types"

export type MACDSeriesResult = {
  macd: number[]
  signal: number[]
  histogram: number[]
}

export const calculateRSISeries = (candles: Candle[], period = 14): number[] => {
  if (candles.length < period + 1) return []
  const rsi = new RSI(period)
  const result: number[] = []
  for (const c of candles) {
    rsi.add(c.close)
    if (rsi.isStable) result.push(Number(rsi.getResult()))
  }
  return result
}

export const calculateSMASeries = (candles: Candle[], period = 20): number[] => {
  if (candles.length < period) return []
  const sma = new SMA(period)
  const result: number[] = []
  for (const c of candles) {
    sma.add(c.close)
    if (sma.isStable) result.push(Number(sma.getResult()))
  }
  return result
}

export const calculateEMASeries = (candles: Candle[], period = 20): number[] => {
  if (candles.length < period) return []
  const ema = new EMA(period)
  const result: number[] = []
  for (const c of candles) {
    ema.add(c.close)
    if (ema.isStable) result.push(Number(ema.getResult()))
  }
  return result
}

export const calculateMACDSeries = (candles: Candle[], fast = 12, slow = 26, signal = 9): MACDSeriesResult => {
  const empty: MACDSeriesResult = { macd: [], signal: [], histogram: [] }
  if (candles.length < slow + signal - 1) return empty
  const macd = new MACD(new EMA(fast), new EMA(slow), new EMA(signal))
  const macdArr: number[] = []
  const signalArr: number[] = []
  const histogramArr: number[] = []
  for (const c of candles) {
    macd.add(c.close)
    if (macd.isStable) {
      const r = macd.getResult()!
      macdArr.push(Number(r.macd))
      signalArr.push(Number(r.signal))
      histogramArr.push(Number(r.histogram))
    }
  }
  return { macd: macdArr, signal: signalArr, histogram: histogramArr }
}

export const calculateStochasticSeries = (candles: Candle[], period = 14, signalPeriod = 3): number[] => {
  if (candles.length < period + signalPeriod) return []
  const stoch = new StochasticOscillator(period, 3, signalPeriod)
  const result: number[] = []
  for (const c of candles) {
    stoch.add({ high: c.high, low: c.low, close: c.close })
    if (stoch.isStable) result.push(Number(stoch.getResult()!.stochK))
  }
  return result
}

export const calculateWilliamsRSeries = (candles: Candle[], period = 14): number[] => {
  if (candles.length < period + 1) return []
  const wr = new WilliamsR(period)
  const result: number[] = []
  for (const c of candles) {
    wr.add({ high: c.high, low: c.low, close: c.close })
    if (wr.isStable) result.push(Number(wr.getResult()))
  }
  return result
}
