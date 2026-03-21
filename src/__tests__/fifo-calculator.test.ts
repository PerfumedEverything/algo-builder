import { describe, it, expect } from "vitest"
import { FifoCalculator } from "@/server/services/fifo-calculator"
import type { PositionOperation } from "@/core/types"

const makeOp = (type: "BUY" | "SELL", quantity: number, price: number, date: string): PositionOperation => ({
  type,
  quantity,
  price,
  date,
  amount: price * quantity,
})

describe("FifoCalculator", () => {
  it("single buy — one lot with P&L", () => {
    const ops = [makeOp("BUY", 10, 100, "2026-01-01")]
    const lots = FifoCalculator.calculate(ops, 120)

    expect(lots).toHaveLength(1)
    expect(lots[0].buyPrice).toBe(100)
    expect(lots[0].quantity).toBe(10)
    expect(lots[0].currentPrice).toBe(120)
    expect(lots[0].pnl).toBe(200)
    expect(lots[0].pnlPercent).toBe(20)
  })

  it("buy then partial sell — remaining lot", () => {
    const ops = [
      makeOp("BUY", 10, 100, "2026-01-01"),
      makeOp("SELL", 4, 110, "2026-01-05"),
    ]
    const lots = FifoCalculator.calculate(ops, 120)

    expect(lots).toHaveLength(1)
    expect(lots[0].quantity).toBe(6)
    expect(lots[0].pnl).toBe(120)
  })

  it("buy then full sell — no lots", () => {
    const ops = [
      makeOp("BUY", 10, 100, "2026-01-01"),
      makeOp("SELL", 10, 110, "2026-01-05"),
    ]
    const lots = FifoCalculator.calculate(ops, 120)

    expect(lots).toHaveLength(0)
  })

  it("FIFO order — sells oldest first", () => {
    const ops = [
      makeOp("BUY", 5, 100, "2026-01-01"),
      makeOp("BUY", 5, 200, "2026-01-10"),
      makeOp("SELL", 5, 150, "2026-01-15"),
    ]
    const lots = FifoCalculator.calculate(ops, 250)

    expect(lots).toHaveLength(1)
    expect(lots[0].buyPrice).toBe(200)
    expect(lots[0].quantity).toBe(5)
    expect(lots[0].pnl).toBe(250)
  })

  it("FIFO order — partial sell across lots", () => {
    const ops = [
      makeOp("BUY", 3, 100, "2026-01-01"),
      makeOp("BUY", 7, 200, "2026-01-10"),
      makeOp("SELL", 5, 150, "2026-01-15"),
    ]
    const lots = FifoCalculator.calculate(ops, 250)

    expect(lots).toHaveLength(1)
    expect(lots[0].buyPrice).toBe(200)
    expect(lots[0].quantity).toBe(5)
  })

  it("multiple buys, no sells — all lots", () => {
    const ops = [
      makeOp("BUY", 10, 100, "2026-01-01"),
      makeOp("BUY", 5, 150, "2026-01-10"),
      makeOp("BUY", 3, 200, "2026-01-20"),
    ]
    const lots = FifoCalculator.calculate(ops, 180)

    expect(lots).toHaveLength(3)
    expect(lots[0].quantity).toBe(10)
    expect(lots[1].quantity).toBe(5)
    expect(lots[2].quantity).toBe(3)
  })

  it("empty operations — no lots", () => {
    const lots = FifoCalculator.calculate([], 100)
    expect(lots).toHaveLength(0)
  })

  it("handles unordered operations — sorts by date", () => {
    const ops = [
      makeOp("SELL", 3, 150, "2026-01-15"),
      makeOp("BUY", 5, 100, "2026-01-01"),
      makeOp("BUY", 5, 200, "2026-01-10"),
    ]
    const lots = FifoCalculator.calculate(ops, 250)

    expect(lots).toHaveLength(2)
    expect(lots[0].buyPrice).toBe(100)
    expect(lots[0].quantity).toBe(2)
    expect(lots[1].buyPrice).toBe(200)
    expect(lots[1].quantity).toBe(5)
  })

  it("P&L percent with zero buy price", () => {
    const ops = [makeOp("BUY", 10, 0, "2026-01-01")]
    const lots = FifoCalculator.calculate(ops, 100)

    expect(lots[0].pnlPercent).toBe(0)
    expect(lots[0].pnl).toBe(1000)
  })

  it("negative P&L when price drops", () => {
    const ops = [makeOp("BUY", 10, 200, "2026-01-01")]
    const lots = FifoCalculator.calculate(ops, 150)

    expect(lots[0].pnl).toBe(-500)
    expect(lots[0].pnlPercent).toBe(-25)
  })
})
