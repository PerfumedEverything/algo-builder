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

  it("calculates realized P&L for BUY+SELL pair", async () => {
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
    expect(stats.currentAmount).toBeCloseTo(10890, 0)
    expect(stats.holdingQty).toBe(0)
  })

  it("calculates unrealized P&L for open position", async () => {
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
