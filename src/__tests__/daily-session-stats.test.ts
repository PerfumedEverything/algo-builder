import { describe, it, expect } from "vitest"
import { aggregateSessionStats } from "@/server/actions/chart-actions"

describe("aggregateSessionStats", () => {
  const twoCandles = [
    { open: 100, high: 110, low: 95, volume: 1000 },
    { open: 105, high: 115, low: 98, volume: 2000 },
  ]

  it("sessionOpen is first candle open", () => {
    const result = aggregateSessionStats(twoCandles)
    expect(result.sessionOpen).toBe(100)
  })

  it("high is max of all candle highs", () => {
    const result = aggregateSessionStats(twoCandles)
    expect(result.high).toBe(115)
  })

  it("low is min of all candle lows", () => {
    const result = aggregateSessionStats(twoCandles)
    expect(result.low).toBe(95)
  })

  it("volume is sum of all candle volumes", () => {
    const result = aggregateSessionStats(twoCandles)
    expect(result.volume).toBe(3000)
  })

  it("empty candles returns zeros", () => {
    const result = aggregateSessionStats([])
    expect(result).toEqual({ sessionOpen: 0, high: 0, low: 0, volume: 0 })
  })

  it("single candle returns its own values", () => {
    const single = [{ open: 280, high: 285, low: 275, volume: 50000 }]
    const result = aggregateSessionStats(single)
    expect(result).toEqual({ sessionOpen: 280, high: 285, low: 275, volume: 50000 })
  })

  it("handles many candles (realistic session)", () => {
    const candles = Array.from({ length: 390 }, (_, i) => ({
      open: 200 + (i % 10),
      high: 200 + (i % 10) + Math.random() * 5,
      low: 200 + (i % 10) - Math.random() * 5,
      volume: 1000 + i * 10,
    }))
    const result = aggregateSessionStats(candles)
    const expectedHigh = Math.max(...candles.map((c) => c.high))
    const expectedLow = Math.min(...candles.map((c) => c.low))
    const expectedVolume = candles.reduce((sum, c) => sum + c.volume, 0)
    expect(result.sessionOpen).toBe(candles[0].open)
    expect(result.high).toBeCloseTo(expectedHigh, 10)
    expect(result.low).toBeCloseTo(expectedLow, 10)
    expect(result.volume).toBeCloseTo(expectedVolume, 10)
  })
})
