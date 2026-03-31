import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetStrategies = vi.fn()
const mockGetStats = vi.fn()
const mockGetOperations = vi.fn().mockResolvedValue([])
const mockGetPrice = vi.fn()

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    publish: vi.fn(),
  },
}))
vi.mock("@/server/actions/helpers", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/server/services", () => ({
  StrategyService: vi.fn(function () {
    return { getStrategies: mockGetStrategies }
  }),
  OperationService: vi.fn(function () {
    return { getStats: mockGetStats, getOperations: mockGetOperations }
  }),
  BrokerService: vi.fn(function () {
    return { getInstrumentPrice: vi.fn().mockRejectedValue(new Error("no broker")) }
  }),
}))
vi.mock("@/server/services/price-cache", () => ({
  PriceCache: vi.fn(function () {
    return { getPrice: mockGetPrice }
  }),
}))

import { getPaperPortfolioAction } from "@/server/actions/paper-portfolio-actions"
import type { OperationStats } from "@/core/types"

const zeroStats: OperationStats = {
  totalOperations: 0,
  buyCount: 0,
  sellCount: 0,
  pnl: 0,
  pnlPercent: 0,
  initialAmount: 0,
  currentAmount: 0,
  holdingQty: 0,
  lastBuyPrice: 0,
}

const makeStrategy = (overrides: Record<string, unknown>) => ({
  id: "s1",
  userId: "user-1",
  name: "Test Strategy",
  instrument: "SBER",
  ...overrides,
})

describe("getPaperPortfolioAction — never skips rows", () => {
  beforeEach(() => {
    mockGetStats.mockResolvedValue(zeroStats)
    mockGetPrice.mockResolvedValue(null)
  })

  it("includes strategy with missing instrument as '—'", async () => {
    mockGetStrategies.mockResolvedValue([makeStrategy({ instrument: undefined })])

    const res = await getPaperPortfolioAction()

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data).toHaveLength(1)
    expect(res.data[0].instrument).toBe("—")
  })

  it("includes strategy when price fetch throws", async () => {
    mockGetStrategies.mockResolvedValue([makeStrategy({ instrument: "SBER" })])
    mockGetPrice.mockRejectedValue(new Error("Redis timeout"))

    const res = await getPaperPortfolioAction()

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data).toHaveLength(1)
    expect(res.data[0].instrument).toBe("SBER")
    expect(mockGetStats).toHaveBeenCalledWith("s1", undefined)
  })

  it("includes strategy with 0 operations", async () => {
    mockGetStrategies.mockResolvedValue([makeStrategy({ instrument: "GAZP" })])
    mockGetStats.mockResolvedValue({ ...zeroStats, totalOperations: 0 })

    const res = await getPaperPortfolioAction()

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data).toHaveLength(1)
    expect(res.data[0].stats.totalOperations).toBe(0)
  })

  it("includes all strategies regardless of operations count", async () => {
    mockGetStrategies.mockResolvedValue([
      makeStrategy({ id: "s1", instrument: "SBER" }),
      makeStrategy({ id: "s2", instrument: undefined }),
      makeStrategy({ id: "s3", instrument: "GAZP" }),
    ])

    const res = await getPaperPortfolioAction()

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data).toHaveLength(3)
  })

  it("returns empty array when no strategies", async () => {
    mockGetStrategies.mockResolvedValue([])

    const res = await getPaperPortfolioAction()

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data).toHaveLength(0)
  })
})
