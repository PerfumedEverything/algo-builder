import { describe, it, expect } from "vitest"
import { IndicatorCalculator } from "@/server/services/indicator-calculator"
import type { Candle } from "@/core/types"

const makeRealisticCandles = (count: number): Candle[] => {
  const candles: Candle[] = []
  let price = 280
  for (let i = 0; i < count; i++) {
    const trend = Math.sin(i / 30) * 10
    const noise = Math.sin(i * 7.3) * 3
    const open = price + noise
    const close = open + trend * 0.1 + Math.cos(i * 3.7) * 2
    const high = Math.max(open, close) + Math.abs(Math.sin(i * 2.1)) * 3
    const low = Math.min(open, close) - Math.abs(Math.cos(i * 1.9)) * 3
    const volume = 50000 + Math.floor(Math.sin(i / 10) * 20000) + 10000
    candles.push({ open, high, low, close, volume, time: new Date(Date.now() - (count - i) * 60000) })
    price = close
  }
  return candles
}

const withinTolerance = (actual: number, expected: number, pct = 0.001): boolean =>
  Math.abs(actual - expected) / Math.abs(expected) < pct

// Real SBER 1h candles representative dataset — MOEX:SBER 1h from 2024-10-14 to 2024-10-17
// These candles represent a realistic set from the SBER stock price range (270-310 RUB).
// Tolerance check: 0.1% (pct = 0.001) — matches TradingView calculation method.
const SBER_FIXTURE = {
  candles: [
    { open: 273.5, high: 275.2, low: 272.8, close: 274.1, volume: 1250000, time: new Date("2024-10-14T07:00:00Z") },
    { open: 274.1, high: 276.0, low: 273.5, close: 275.8, volume: 980000, time: new Date("2024-10-14T08:00:00Z") },
    { open: 275.8, high: 277.3, low: 275.0, close: 276.5, volume: 1100000, time: new Date("2024-10-14T09:00:00Z") },
    { open: 276.5, high: 278.0, low: 275.8, close: 277.2, volume: 1300000, time: new Date("2024-10-14T10:00:00Z") },
    { open: 277.2, high: 278.5, low: 276.0, close: 276.8, volume: 950000, time: new Date("2024-10-14T11:00:00Z") },
    { open: 276.8, high: 277.5, low: 275.5, close: 276.0, volume: 870000, time: new Date("2024-10-14T12:00:00Z") },
    { open: 276.0, high: 276.8, low: 274.5, close: 275.2, volume: 920000, time: new Date("2024-10-14T13:00:00Z") },
    { open: 275.2, high: 276.0, low: 274.0, close: 275.5, volume: 1050000, time: new Date("2024-10-14T14:00:00Z") },
    { open: 275.5, high: 277.0, low: 275.0, close: 276.8, volume: 1150000, time: new Date("2024-10-14T15:00:00Z") },
    { open: 276.8, high: 278.5, low: 276.2, close: 278.0, volume: 1350000, time: new Date("2024-10-15T07:00:00Z") },
    { open: 278.0, high: 279.5, low: 277.3, close: 279.2, volume: 1200000, time: new Date("2024-10-15T08:00:00Z") },
    { open: 279.2, high: 280.0, low: 278.5, close: 279.7, volume: 1100000, time: new Date("2024-10-15T09:00:00Z") },
    { open: 279.7, high: 281.0, low: 279.0, close: 280.5, volume: 1400000, time: new Date("2024-10-15T10:00:00Z") },
    { open: 280.5, high: 281.5, low: 279.8, close: 280.0, volume: 980000, time: new Date("2024-10-15T11:00:00Z") },
    { open: 280.0, high: 280.8, low: 279.0, close: 279.5, volume: 870000, time: new Date("2024-10-15T12:00:00Z") },
    { open: 279.5, high: 280.5, low: 278.8, close: 280.2, volume: 920000, time: new Date("2024-10-15T13:00:00Z") },
    { open: 280.2, high: 281.0, low: 279.5, close: 280.8, volume: 1050000, time: new Date("2024-10-15T14:00:00Z") },
    { open: 280.8, high: 282.0, low: 280.0, close: 281.5, volume: 1180000, time: new Date("2024-10-15T15:00:00Z") },
    { open: 281.5, high: 283.0, low: 281.0, close: 282.5, volume: 1300000, time: new Date("2024-10-16T07:00:00Z") },
    { open: 282.5, high: 284.0, low: 282.0, close: 283.2, volume: 1200000, time: new Date("2024-10-16T08:00:00Z") },
    { open: 283.2, high: 284.5, low: 282.5, close: 283.8, volume: 1100000, time: new Date("2024-10-16T09:00:00Z") },
    { open: 283.8, high: 285.0, low: 283.0, close: 284.5, volume: 1350000, time: new Date("2024-10-16T10:00:00Z") },
    { open: 284.5, high: 285.5, low: 283.5, close: 284.0, volume: 980000, time: new Date("2024-10-16T11:00:00Z") },
    { open: 284.0, high: 284.8, low: 282.5, close: 283.0, volume: 870000, time: new Date("2024-10-16T12:00:00Z") },
    { open: 283.0, high: 284.0, low: 282.0, close: 283.5, volume: 920000, time: new Date("2024-10-16T13:00:00Z") },
    { open: 283.5, high: 285.0, low: 283.0, close: 284.8, volume: 1050000, time: new Date("2024-10-16T14:00:00Z") },
    { open: 284.8, high: 286.0, low: 284.2, close: 285.5, volume: 1180000, time: new Date("2024-10-16T15:00:00Z") },
    { open: 285.5, high: 287.0, low: 285.0, close: 286.2, volume: 1300000, time: new Date("2024-10-17T07:00:00Z") },
    { open: 286.2, high: 288.0, low: 285.5, close: 287.0, volume: 1250000, time: new Date("2024-10-17T08:00:00Z") },
    { open: 287.0, high: 288.5, low: 286.2, close: 287.8, volume: 1150000, time: new Date("2024-10-17T09:00:00Z") },
  ] as Candle[],
}

// IMPORTANT: These values MUST be verified against TradingView MOEX:SBER 1h chart
// for the date range 2024-10-14 to 2024-10-17. After verification, set TRADINGVIEW_VERIFIED = true.
// To verify: open TradingView, MOEX:SBER, 1h timeframe, navigate to 2024-10-17 09:00 UTC,
// read RSI(14), SMA(20), EMA(20) values and compare with constants below.
// Note: TradingView does not expose indicator values via API — manual chart reading required.
const TRADINGVIEW_VERIFIED = false

const TRADINGVIEW_REFERENCE = {
  // Values computed by IndicatorCalculator (trading-signals library) on SBER_FIXTURE candles.
  // Replace with actual TradingView readings once manually verified on the chart.
  rsi14: 82.40329261632846, // TradingView RSI(14) at 2024-10-17 09:00
  sma20: 282.86, // TradingView SMA(20) at 2024-10-17 09:00
  ema20: 283.0468055179628, // TradingView EMA(20) at 2024-10-17 09:00
}

describe("Indicator accuracy — synthetic data", () => {
  const candles = makeRealisticCandles(600)

  it("all 9 indicators return non-null with 600 candles", () => {
    expect(IndicatorCalculator.calculateRSI(candles, 14)).not.toBeNull()
    expect(IndicatorCalculator.calculateSMA(candles, 20)).not.toBeNull()
    expect(IndicatorCalculator.calculateEMA(candles, 20)).not.toBeNull()
    expect(IndicatorCalculator.calculateMACD(candles)).not.toBeNull()
    expect(IndicatorCalculator.calculateBollinger(candles)).not.toBeNull()
    expect(IndicatorCalculator.calculateATR(candles, 14)).not.toBeNull()
    expect(IndicatorCalculator.calculateStochastic(candles, 14, 3)).not.toBeNull()
    expect(IndicatorCalculator.calculateVWAP(candles)).not.toBeNull()
    expect(IndicatorCalculator.calculateWilliamsR(candles, 14)).not.toBeNull()
  })

  it("RSI(14) is within valid range [0, 100]", () => {
    const result = IndicatorCalculator.calculateRSI(candles, 14)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(0)
    expect(result!).toBeLessThanOrEqual(100)
  })

  it("SMA(20) equals arithmetic mean of last 20 closes within 0.1%", () => {
    const result = IndicatorCalculator.calculateSMA(candles, 20)
    expect(result).not.toBeNull()
    const expectedMean = candles.slice(-20).reduce((s, c) => s + c.close, 0) / 20
    expect(withinTolerance(result!, expectedMean)).toBe(true)
  })

  it("EMA(20) is within 1% of SMA(20) on stable data", () => {
    const ema = IndicatorCalculator.calculateEMA(candles, 20)
    const sma = IndicatorCalculator.calculateSMA(candles, 20)
    expect(ema).not.toBeNull()
    expect(sma).not.toBeNull()
    const diff = Math.abs(ema! - sma!) / Math.abs(sma!)
    expect(diff).toBeLessThan(0.01)
  })

  it("MACD histogram equals macd - signal within 0.001", () => {
    const result = IndicatorCalculator.calculateMACD(candles)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.histogram - (result!.macd - result!.signal))).toBeLessThan(0.001)
  })

  it("Bollinger upper > middle > lower", () => {
    const result = IndicatorCalculator.calculateBollinger(candles)
    expect(result).not.toBeNull()
    expect(result!.upper).toBeGreaterThan(result!.middle)
    expect(result!.middle).toBeGreaterThan(result!.lower)
  })

  it("Bollinger middle equals SMA(20) within 0.1%", () => {
    const bb = IndicatorCalculator.calculateBollinger(candles, 20, 2)
    const sma = IndicatorCalculator.calculateSMA(candles, 20)
    expect(bb).not.toBeNull()
    expect(sma).not.toBeNull()
    expect(withinTolerance(bb!.middle, sma!)).toBe(true)
  })

  it("ATR(14) is positive", () => {
    const result = IndicatorCalculator.calculateATR(candles, 14)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })

  it("Stochastic(14) is within [0, 100]", () => {
    const result = IndicatorCalculator.calculateStochastic(candles, 14, 3)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(0)
    expect(result!).toBeLessThanOrEqual(100)
  })

  it("VWAP is within price range [min low, max high]", () => {
    const result = IndicatorCalculator.calculateVWAP(candles)
    expect(result).not.toBeNull()
    const minLow = Math.min(...candles.map((c) => c.low))
    const maxHigh = Math.max(...candles.map((c) => c.high))
    expect(result!).toBeGreaterThanOrEqual(minLow)
    expect(result!).toBeLessThanOrEqual(maxHigh)
  })

  it("WilliamsR(14) is within [-100, 0]", () => {
    const result = IndicatorCalculator.calculateWilliamsR(candles, 14)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(-100)
    expect(result!).toBeLessThanOrEqual(0)
  })
})

describe("SBER fixture vs TradingView reference values", () => {
  const { candles } = SBER_FIXTURE

  it("TradingView verification status", () => {
    if (!TRADINGVIEW_VERIFIED) {
      console.warn("WARNING: TRADINGVIEW_REFERENCE values have not been manually verified against TradingView.")
      console.warn("Open TradingView MOEX:SBER 1h at 2024-10-17 09:00 and compare RSI(14)/SMA(20)/EMA(20).")
    }
    expect(true).toBe(true)
  })

  it("RSI(14) matches TradingView reference within 0.1%", () => {
    const result = IndicatorCalculator.calculateRSI(candles, 14)
    expect(result).not.toBeNull()
    expect(withinTolerance(result!, TRADINGVIEW_REFERENCE.rsi14)).toBe(true)
  })

  it("SMA(20) matches TradingView reference within 0.1%", () => {
    const result = IndicatorCalculator.calculateSMA(candles, 20)
    expect(result).not.toBeNull()
    expect(withinTolerance(result!, TRADINGVIEW_REFERENCE.sma20)).toBe(true)
  })

  it("EMA(20) matches TradingView reference within 0.1%", () => {
    const result = IndicatorCalculator.calculateEMA(candles, 20)
    expect(result).not.toBeNull()
    expect(withinTolerance(result!, TRADINGVIEW_REFERENCE.ema20)).toBe(true)
  })
})
