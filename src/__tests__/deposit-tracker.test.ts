import { describe, it, expect } from "vitest"
import { calculateRealPnl } from "@/lib/deposit-calc"

describe("calculateRealPnl", () => {
  it("calculates positive real P&L correctly", () => {
    const result = calculateRealPnl(100_000, 20_000, 90_000)
    expect(result.netDeposits).toBe(80_000)
    expect(result.realPnl).toBe(10_000)
    expect(result.realPnlPercent).toBe(12.5)
  })

  it("returns zero percent when no deposits", () => {
    const result = calculateRealPnl(0, 0, 50_000)
    expect(result.netDeposits).toBe(0)
    expect(result.realPnl).toBe(50_000)
    expect(result.realPnlPercent).toBe(0)
  })

  it("calculates negative real P&L correctly", () => {
    const result = calculateRealPnl(100_000, 0, 80_000)
    expect(result.netDeposits).toBe(100_000)
    expect(result.realPnl).toBe(-20_000)
    expect(result.realPnlPercent).toBe(-20)
  })

  it("handles equal deposits and portfolio value", () => {
    const result = calculateRealPnl(50_000, 0, 50_000)
    expect(result.netDeposits).toBe(50_000)
    expect(result.realPnl).toBe(0)
    expect(result.realPnlPercent).toBe(0)
  })

  it("handles withdrawals exceeding deposits", () => {
    const result = calculateRealPnl(10_000, 15_000, 5_000)
    expect(result.netDeposits).toBe(-5_000)
    expect(result.realPnl).toBe(10_000)
    expect(result.realPnlPercent).toBe(0)
  })
})
