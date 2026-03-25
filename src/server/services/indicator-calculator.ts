import { RSI, SMA, EMA, MACD, BollingerBands, ATR, Stochastic, VWAP, WilliamsR } from "technicalindicators"
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
    const closes = candles.map((c) => c.close)
    const result = RSI.calculate({ values: closes, period })
    return result[result.length - 1] ?? null
  }

  static calculateSMA(candles: Candle[], period = 20): number | null {
    if (candles.length < period) return null
    const closes = candles.map((c) => c.close)
    const result = SMA.calculate({ values: closes, period })
    return result[result.length - 1] ?? null
  }

  static calculateEMA(candles: Candle[], period = 20): number | null {
    if (candles.length < period) return null
    const closes = candles.map((c) => c.close)
    const result = EMA.calculate({ values: closes, period })
    return result[result.length - 1] ?? null
  }

  static calculateMACD(
    candles: Candle[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ): MACDResult | null {
    if (candles.length < slowPeriod + signalPeriod - 1) return null
    const closes = candles.map((c) => c.close)
    const result = MACD.calculate({
      values: closes,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })

    const last = result[result.length - 1]
    if (!last) return null
    return {
      macd: last.MACD ?? 0,
      signal: last.signal ?? 0,
      histogram: last.histogram ?? 0,
    }
  }

  static calculateBollinger(
    candles: Candle[],
    period = 20,
    stdDev = 2,
  ): BollingerResult | null {
    if (candles.length < period) return null
    const closes = candles.map((c) => c.close)
    const result = BollingerBands.calculate({
      values: closes,
      period,
      stdDev,
    })

    const last = result[result.length - 1]
    if (!last) return null
    return {
      upper: last.upper ?? 0,
      middle: last.middle ?? 0,
      lower: last.lower ?? 0,
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
    const result = ATR.calculate({
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: candles.map((c) => c.close),
      period,
    })
    return result[result.length - 1] ?? null
  }

  static calculateStochastic(candles: Candle[], period = 14, signalPeriod = 3): number | null {
    if (candles.length < period + signalPeriod) return null
    const result = Stochastic.calculate({
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: candles.map((c) => c.close),
      period,
      signalPeriod,
    })
    const last = result[result.length - 1]
    if (!last) return null
    return last.k ?? null
  }

  static calculateVWAP(candles: Candle[]): number | null {
    if (candles.length < 5) return null
    const result = VWAP.calculate({
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: candles.map((c) => c.close),
      volume: candles.map((c) => c.volume),
    })
    return result[result.length - 1] ?? null
  }

  static calculateWilliamsR(candles: Candle[], period = 14): number | null {
    if (candles.length < period + 1) return null
    const result = WilliamsR.calculate({
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: candles.map((c) => c.close),
      period,
    })
    return result[result.length - 1] ?? null
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
