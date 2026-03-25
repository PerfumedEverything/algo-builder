import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

import { OperationService } from "@/server/services/operation-service"
import type { StrategyOperation } from "@/core/types"

const mockOps: StrategyOperation[] = [
  {
    id: "op-1",
    strategyId: "s1",
    userId: "u1",
    type: "BUY",
    instrument: "SBER",
    price: 300,
    quantity: 33,
    amount: 9900,
    createdAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "op-2",
    strategyId: "s1",
    userId: "u1",
    type: "SELL",
    instrument: "SBER",
    price: 330,
    quantity: 33,
    amount: 10890,
    createdAt: "2026-03-20T12:00:00Z",
  },
]

const mockBuyOnly: StrategyOperation[] = [
  {
    id: "op-3",
    strategyId: "s2",
    userId: "u1",
    type: "BUY",
    instrument: "GAZP",
    price: 150,
    quantity: 66,
    amount: 9900,
    createdAt: "2026-03-20T10:00:00Z",
  },
]

describe("OperationService.getStats", () => {
  let service: OperationService

  beforeEach(() => {
    service = new OperationService()
  })

  it("returns zero stats for no operations", async () => {
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue([]),
    } as never)

    const stats = await service.getStats("empty")
    expect(stats.totalOperations).toBe(0)
    expect(stats.pnl).toBe(0)
    expect(stats.pnlPercent).toBe(0)
    expect(stats.holdingQty).toBe(0)
  })

  it("calculates realized P&L for BUY+SELL pair — currentAmount is 0 when closed", async () => {
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(mockOps),
    } as never)

    const stats = await service.getStats("s1")
    expect(stats.totalOperations).toBe(2)
    expect(stats.buyCount).toBe(1)
    expect(stats.sellCount).toBe(1)
    expect(stats.pnl).toBe(990)
    expect(stats.pnlPercent).toBeCloseTo(10, 0)
    expect(stats.initialAmount).toBe(9900)
    expect(stats.currentAmount).toBe(0)
    expect(stats.holdingQty).toBe(0)
  })

  it("calculates unrealized P&L for open position — currentAmount equals market value", async () => {
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(mockBuyOnly),
    } as never)

    const stats = await service.getStats("s2", 180)
    expect(stats.totalOperations).toBe(1)
    expect(stats.buyCount).toBe(1)
    expect(stats.sellCount).toBe(0)
    expect(stats.pnl).toBe(66 * 180 - 9900)
    expect(stats.pnlPercent).toBeCloseTo(((66 * 180 - 9900) / 9900) * 100, 0)
    expect(stats.holdingQty).toBe(66)
    expect(stats.currentAmount).toBe(66 * 180)
  })

  it("calculates zero unrealized without currentPrice", async () => {
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(mockBuyOnly),
    } as never)

    const stats = await service.getStats("s2")
    expect(stats.pnl).toBe(0)
    expect(stats.pnlPercent).toBe(0)
  })
})

describe("OperationService.getStats — extended scenarios", () => {
  let service: OperationService

  beforeEach(() => {
    service = new OperationService()
  })

  it("multiple buys + multiple sells — correct realized P&L", async () => {
    const ops: StrategyOperation[] = [
      { id: "1", strategyId: "s1", userId: "u1", type: "BUY", instrument: "SBER", price: 100, quantity: 50, amount: 5000, createdAt: "2026-01-01T00:00:00Z" },
      { id: "2", strategyId: "s1", userId: "u1", type: "BUY", instrument: "SBER", price: 200, quantity: 25, amount: 5000, createdAt: "2026-01-10T00:00:00Z" },
      { id: "3", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 150, quantity: 20, amount: 3000, createdAt: "2026-01-15T00:00:00Z" },
      { id: "4", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 160, quantity: 30, amount: 4800, createdAt: "2026-01-20T00:00:00Z" },
    ]
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(ops),
    } as never)

    const stats = await service.getStats("s1")

    expect(stats.buyCount).toBe(2)
    expect(stats.sellCount).toBe(2)
    expect(stats.holdingQty).toBe(25)
    const totalBought = 75
    const totalBuyAmount = 10000
    const avgBuyPrice = totalBuyAmount / totalBought
    const totalSold = 50
    const totalSellAmount = 7800
    const expectedRealizedPnl = totalSellAmount - avgBuyPrice * totalSold
    expect(stats.pnl).toBeCloseTo(expectedRealizedPnl, 2)
  })

  it("all positions closed — holdingQty is 0, currentAmount is 0, pnl is realized only", async () => {
    const ops: StrategyOperation[] = [
      { id: "1", strategyId: "s1", userId: "u1", type: "BUY", instrument: "GAZP", price: 200, quantity: 50, amount: 10000, createdAt: "2026-01-01T00:00:00Z" },
      { id: "2", strategyId: "s1", userId: "u1", type: "SELL", instrument: "GAZP", price: 220, quantity: 50, amount: 11000, createdAt: "2026-01-10T00:00:00Z" },
    ]
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(ops),
    } as never)

    const stats = await service.getStats("s1")

    expect(stats.holdingQty).toBe(0)
    expect(stats.pnl).toBeCloseTo(1000, 2)
    expect(stats.initialAmount).toBe(10000)
    expect(stats.currentAmount).toBe(0)
  })

  it("partial sell (buy 100, sell 50) — correct holdingQty and unrealized P&L with currentPrice", async () => {
    const ops: StrategyOperation[] = [
      { id: "1", strategyId: "s1", userId: "u1", type: "BUY", instrument: "LKOH", price: 100, quantity: 100, amount: 10000, createdAt: "2026-01-01T00:00:00Z" },
      { id: "2", strategyId: "s1", userId: "u1", type: "SELL", instrument: "LKOH", price: 110, quantity: 50, amount: 5500, createdAt: "2026-01-10T00:00:00Z" },
    ]
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(ops),
    } as never)

    const currentPrice = 120
    const stats = await service.getStats("s1", currentPrice)

    expect(stats.holdingQty).toBe(50)
    const avgBuyPrice = 10000 / 100
    const realizedPnl = 5500 - avgBuyPrice * 50
    const unrealizedPnl = 50 * currentPrice - 50 * avgBuyPrice
    expect(stats.pnl).toBeCloseTo(realizedPnl + unrealizedPnl, 2)
  })

  it("multiple buys at different prices + one sell — correct average cost basis", async () => {
    const ops: StrategyOperation[] = [
      { id: "1", strategyId: "s1", userId: "u1", type: "BUY", instrument: "SBER", price: 100, quantity: 30, amount: 3000, createdAt: "2026-01-01T00:00:00Z" },
      { id: "2", strategyId: "s1", userId: "u1", type: "BUY", instrument: "SBER", price: 130, quantity: 20, amount: 2600, createdAt: "2026-01-05T00:00:00Z" },
      { id: "3", strategyId: "s1", userId: "u1", type: "BUY", instrument: "SBER", price: 160, quantity: 10, amount: 1600, createdAt: "2026-01-08T00:00:00Z" },
      { id: "4", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 150, quantity: 30, amount: 4500, createdAt: "2026-01-15T00:00:00Z" },
    ]
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(ops),
    } as never)

    const stats = await service.getStats("s1")

    const totalBought = 60
    const totalBuyAmount = 7200
    const avgBuyPrice = totalBuyAmount / totalBought
    expect(avgBuyPrice).toBeCloseTo(120, 5)

    const totalSold = 30
    const totalSellAmount = 4500
    const expectedRealizedPnl = totalSellAmount - avgBuyPrice * totalSold
    expect(expectedRealizedPnl).toBeCloseTo(900, 2)
    expect(stats.pnl).toBeCloseTo(expectedRealizedPnl, 2)
    expect(stats.holdingQty).toBe(30)
  })

  it("duplicate sell race condition (1 buy + 6 simultaneous sells) — documents negative holdingQty bug", async () => {
    // BUG: race condition — if 6 sell operations record simultaneously without atomic guard,
    // holdingQty goes negative and P&L is incorrect.
    // This test documents the *current behavior* of getStats when given such input.
    const ops: StrategyOperation[] = [
      { id: "buy-1", strategyId: "s1", userId: "u1", type: "BUY", instrument: "SBER", price: 100, quantity: 33, amount: 3300, createdAt: "2026-01-01T00:00:00Z" },
      { id: "sell-1", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 110, quantity: 33, amount: 3630, createdAt: "2026-01-02T00:00:00Z" },
      { id: "sell-2", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 110, quantity: 33, amount: 3630, createdAt: "2026-01-02T00:00:01Z" },
      { id: "sell-3", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 110, quantity: 33, amount: 3630, createdAt: "2026-01-02T00:00:02Z" },
      { id: "sell-4", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 110, quantity: 33, amount: 3630, createdAt: "2026-01-02T00:00:03Z" },
      { id: "sell-5", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 110, quantity: 33, amount: 3630, createdAt: "2026-01-02T00:00:04Z" },
      { id: "sell-6", strategyId: "s1", userId: "u1", type: "SELL", instrument: "SBER", price: 110, quantity: 33, amount: 3630, createdAt: "2026-01-02T00:00:05Z" },
    ]
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      getStatsByStrategyId: vi.fn().mockResolvedValue(ops),
    } as never)

    const stats = await service.getStats("s1")

    // BUG: holdingQty is negative (-165) — physically impossible but getStats doesn't guard against this.
    // Expected (correct): holdingQty = 0 (only 1 sell should have executed due to atomic guard in handleTriggered)
    expect(stats.holdingQty).toBe(-165)
    // BUG: P&L is inflated — shows profit from 6 duplicate sells
    // Formula: totalSellAmount - avgBuyPrice * totalSold = 21780 - 100 * 198 = 1980
    // Expected (correct): 330 (profit from 1 sell: 3630 - 3300)
    expect(stats.pnl).toBeCloseTo(1980, 0)
  })
})

describe("OperationService.recordOperation", () => {
  it("calculates quantity from tradeAmount", async () => {
    const service = new OperationService()
    const mockCreate = vi.fn().mockResolvedValue({ id: "new-op" })
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      create: mockCreate,
    } as never)

    await service.recordOperation({
      strategyId: "s1",
      userId: "u1",
      type: "BUY",
      instrument: "SBER",
      price: 300,
      tradeAmount: 10000,
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 33,
        amount: 9900,
        type: "BUY",
        price: 300,
      }),
    )
  })

  it("defaults tradeAmount to 10000 when not provided", async () => {
    const service = new OperationService()
    const mockCreate = vi.fn().mockResolvedValue({ id: "new-op" })
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      create: mockCreate,
    } as never)

    await service.recordOperation({
      strategyId: "s1",
      userId: "u1",
      type: "SELL",
      instrument: "GAZP",
      price: 150,
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 66,
        amount: 9900,
      }),
    )
  })

  it("ensures at least 1 quantity for expensive instruments", async () => {
    const service = new OperationService()
    const mockCreate = vi.fn().mockResolvedValue({ id: "new-op" })
    vi.spyOn(service as never, "repo", "get").mockReturnValue({
      create: mockCreate,
    } as never)

    await service.recordOperation({
      strategyId: "s1",
      userId: "u1",
      type: "BUY",
      instrument: "EXPENSIVE",
      price: 50000,
      tradeAmount: 10000,
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 1,
        amount: 50000,
      }),
    )
  })
})
