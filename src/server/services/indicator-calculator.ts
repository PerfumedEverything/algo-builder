import { RSI, SMA, EMA, MACD, BollingerBands, ATR, StochasticOscillator, VWAP, WilliamsR } from "trading-signals"
import type { Candle } from "@/core/types"

export type MACDResult = {
  macd: number
  signal: number
  histogram: number
}

export type BollingerResult = {
  upper: number
  middle: number
  lower: number
}

export type DetectedLevels = {
  supports: number[]
  resistances: number[]
}

export class IndicatorCalculator {
  static calculateRSI(candles: Candle[], period = 14): number | null {
    if (candles.length < period + 1) return null
    const rsi = new RSI(period)
    candles.forEach((c) => rsi.add(c.close))
    return rsi.isStable ? Number(rsi.getResult()) : null
  }

  static calculateSMA(candles: Candle[], period = 20): number | null {
    if (candles.length < period) return null
    const sma = new SMA(period)
    candles.forEach((c) => sma.add(c.close))
    return sma.isStable ? Number(sma.getResult()) : null
  }

  static calculateEMA(candles: Candle[], period = 20): number | null {
    if (candles.length < period) return null
    const ema = new EMA(period)
    candles.forEach((c) => ema.add(c.close))
    return ema.isStable ? Number(ema.getResult()) : null
  }

  static calculateMACD(
    candles: Candle[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ): MACDResult | null {
    if (candles.length < slowPeriod + signalPeriod - 1) return null
    const macd = new MACD(new EMA(fastPeriod), new EMA(slowPeriod), new EMA(signalPeriod))
    candles.forEach((c) => macd.add(c.close))
    if (!macd.isStable) return null
    const r = macd.getResult()!
    return {
      macd: Number(r.macd),
      signal: Number(r.signal),
      histogram: Number(r.histogram),
    }
  }

  static calculateBollinger(
    candles: Candle[],
    period = 20,
    stdDev = 2,
  ): BollingerResult | null {
    if (candles.length < period + 1) return null
    const bb = new BollingerBands(period, stdDev)
    candles.forEach((c) => bb.add(c.close))
    if (!bb.isStable) return null
    const r = bb.getResult()!
    return {
      upper: Number(r.upper),
      middle: Number(r.middle),
      lower: Number(r.lower),
    }
  }

  static getAverageVolume(candles: Candle[], period = 20): number {
    const volumes = candles.slice(-period).map((c) => c.volume)
    if (volumes.length === 0) return 0
    return volumes.reduce((sum, v) => sum + v, 0) / volumes.length
  }

  static getPriceChange(candles: Candle[], periodBars = 1): number {
    if (candles.length < periodBars + 1) return 0
    const current = candles[candles.length - 1].close
    const previous = candles[candles.length - 1 - periodBars].close
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  static detectLevels(candles: Candle[], lookback = 50): DetectedLevels {
    const slice = candles.slice(-lookback)
    const supports: number[] = []
    const resistances: number[] = []

    for (let i = 2; i < slice.length - 2; i++) {
      const low = slice[i].low
      const high = slice[i].high

      if (
        low < slice[i - 1].low &&
        low < slice[i - 2].low &&
        low < slice[i + 1].low &&
        low < slice[i + 2].low
      ) {
        supports.push(low)
      }

      if (
        high > slice[i - 1].high &&
        high > slice[i - 2].high &&
        high > slice[i + 1].high &&
        high > slice[i + 2].high
      ) {
        resistances.push(high)
      }
    }

    return {
      supports: this.clusterLevels(supports),
      resistances: this.clusterLevels(resistances),
    }
  }

  static calculateATR(candles: Candle[], period = 14): number | null {
    if (candles.length < period + 1) return null
    const atr = new ATR(period)
    candles.forEach((c) => atr.add({ high: c.high, low: c.low, close: c.close }))
    return atr.isStable ? Number(atr.getResult()) : null
  }

  static calculateStochastic(candles: Candle[], period = 14, signalPeriod = 3): number | null {
    if (candles.length < period + signalPeriod) return null
    const stoch = new StochasticOscillator(period, 3, signalPeriod)
    candles.forEach((c) => stoch.add({ high: c.high, low: c.low, close: c.close }))
    if (!stoch.isStable) return null
    const r = stoch.getResult()!
    return Number(r.stochK)
  }

  static calculateVWAP(candles: Candle[]): number | null {
    if (candles.length < 5) return null
    const vwap = new VWAP()
    candles.forEach((c) => vwap.add({ high: c.high, low: c.low, close: c.close, volume: c.volume }))
    return vwap.isStable ? Number(vwap.getResult()) : null
  }

  static calculateWilliamsR(candles: Candle[], period = 14): number | null {
    if (candles.length < period + 1) return null
    const wr = new WilliamsR(period)
    candles.forEach((c) => wr.add({ high: c.high, low: c.low, close: c.close }))
    return wr.isStable ? Number(wr.getResult()) : null
  }

  private static clusterLevels(levels: number[], threshold = 0.01): number[] {
    if (levels.length === 0) return []

    const sorted = [...levels].sort((a, b) => a - b)
    const clustered: number[] = []
    let cluster = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      if ((sorted[i] - sorted[i - 1]) / sorted[i - 1] < threshold) {
        cluster.push(sorted[i])
      } else {
        clustered.push(cluster.reduce((s, v) => s + v, 0) / cluster.length)
        cluster = [sorted[i]]
      }
    }
    clustered.push(cluster.reduce((s, v) => s + v, 0) / cluster.length)

    return clustered
  }
}
