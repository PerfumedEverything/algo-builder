import { IndicatorCalculator } from "../src/server/services/indicator-calculator"
import type { Candle } from "../src/core/types"

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

const candles = makeRealisticCandles(600)

const rsi = IndicatorCalculator.calculateRSI(candles, 14)
const sma = IndicatorCalculator.calculateSMA(candles, 20)
const ema = IndicatorCalculator.calculateEMA(candles, 20)
const macd = IndicatorCalculator.calculateMACD(candles)
const bb = IndicatorCalculator.calculateBollinger(candles)
const atr = IndicatorCalculator.calculateATR(candles, 14)
const stoch = IndicatorCalculator.calculateStochastic(candles, 14, 3)
const vwap = IndicatorCalculator.calculateVWAP(candles)
const wr = IndicatorCalculator.calculateWilliamsR(candles, 14)

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return "null"
  if (typeof v === "object") return JSON.stringify(v)
  if (typeof v === "number") return v.toFixed(4)
  return String(v)
}

const indicators = [
  { name: "RSI(14)", value: rsi },
  { name: "SMA(20)", value: sma },
  { name: "EMA(20)", value: ema },
  { name: "MACD(12,26,9)", value: macd },
  { name: "Bollinger(20,2)", value: bb },
  { name: "ATR(14)", value: atr },
  { name: "Stochastic(14,3)", value: stoch },
  { name: "VWAP", value: vwap },
  { name: "WilliamsR(14)", value: wr },
]

const smaManual = candles.slice(-20).reduce((s, c) => s + c.close, 0) / 20
const bbMiddleMatchesSma = bb !== null && sma !== null ? Math.abs(bb.middle - sma) / Math.abs(sma) < 0.001 : false
const macdHistogramConsistent = macd !== null ? Math.abs(macd.histogram - (macd.macd - macd.signal)) < 0.001 : false

const rows = indicators
  .map((i) => {
    const val = formatValue(i.value)
    const status = i.value !== null ? "OK" : "FAIL"
    return `| ${i.name} | ${val} | ${status} |`
  })
  .join("\n")

const report = `# Indicator Audit Report

**Date:** ${new Date().toISOString()}
**Library:** trading-signals
**Candles:** 600 deterministic OHLCV (SBER-like, price ≈ 280 RUB)

## Results

| Indicator | Value | Status |
|-----------|-------|--------|
${rows}

## Cross-Checks

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| SMA(20) manual mean | ${smaManual.toFixed(4)} | ${sma !== null ? sma.toFixed(4) : "null"} | ${sma !== null && Math.abs(sma - smaManual) / Math.abs(smaManual) < 0.001 ? "YES" : "NO"} |
| Bollinger middle === SMA(20) | Within 0.1% | ${bb !== null && sma !== null ? (Math.abs(bb.middle - sma) / Math.abs(sma) * 100).toFixed(4) + "%" : "N/A"} | ${bbMiddleMatchesSma ? "YES" : "NO"} |
| MACD histogram === macd - signal | Within 0.001 | ${macd !== null ? Math.abs(macd.histogram - (macd.macd - macd.signal)).toFixed(6) : "N/A"} | ${macdHistogramConsistent ? "YES" : "NO"} |
`

process.stdout.write(report)
