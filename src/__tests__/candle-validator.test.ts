import { describe, it, expect, vi } from "vitest"
import { validateOHLC, filterValidCandles } from "@/server/services/candle-validator"
import type { Candle } from "@/core/types"

const makeCandle = (overrides: Partial<Candle> = {}): Candle => ({
  time: new Date("2026-03-01"),
  open: 100,
  high: 105,
  low: 98,
  close: 102,
  volume: 1000,
  ...overrides,
})

describe("validateOHLC (CALC-04)", () => {
  it("returns true for valid candle", () => {
    expect(validateOHLC(makeCandle())).toBe(true)
  })

  it("CALC-06: rejects candle with high < low", () => {
    expect(validateOHLC(makeCandle({ high: 90, low: 100 }))).toBe(false)
  })

  it("CALC-06: rejects candle with negative volume", () => {
    expect(validateOHLC(makeCandle({ volume: -5 }))).toBe(false)
  })

  it("CALC-06: rejects candle with future timestamp", () => {
    expect(validateOHLC(makeCandle({ time: new Date("2030-01-01") }))).toBe(false)
  })

  it("rejects candle with high < open", () => {
    expect(validateOHLC(makeCandle({ open: 110, high: 105 }))).toBe(false)
  })

  it("rejects candle with low > close", () => {
    expect(validateOHLC(makeCandle({ close: 95, low: 98 }))).toBe(false)
  })
})

describe("filterValidCandles (CALC-05)", () => {
  it("filters out broken candles and keeps valid ones", () => {
    const valid1 = makeCandle()
    const broken1 = makeCandle({ high: 90, low: 100 })
    const broken2 = makeCandle({ volume: -5 })
    const valid2 = makeCandle({ open: 200, high: 210, low: 195, close: 205 })

    const result = filterValidCandles([valid1, broken1, broken2, valid2])
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(valid1)
    expect(result[1]).toBe(valid2)
  })

  it("logs warning for each broken candle", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const broken = makeCandle({ high: 90, low: 100 })
    filterValidCandles([broken])
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain("[CandleValidator]")
    spy.mockRestore()
  })
})
