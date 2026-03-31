import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateGrid, mockStopGrid, mockGetGridStatus, mockProcessPriceTick, mockSuggestParams } =
  vi.hoisted(() => ({
    mockCreateGrid: vi.fn(),
    mockStopGrid: vi.fn(),
    mockGetGridStatus: vi.fn(),
    mockProcessPriceTick: vi.fn(),
    mockSuggestParams: vi.fn(),
  }))

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/server/actions/helpers", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/server/services/grid-trading-service", () => ({
  GridTradingService: vi.fn(function () {
    return {
      createGrid: mockCreateGrid,
      stopGrid: mockStopGrid,
      getGridStatus: mockGetGridStatus,
      processPriceTick: mockProcessPriceTick,
    }
  }),
}))
vi.mock("@/server/services/grid-ai-service", () => ({
  GridAiService: { suggestParams: mockSuggestParams },
}))

import {
  createGridAction,
  stopGridAction,
  getGridStatusAction,
  processGridTickAction,
  suggestGridParamsAction,
} from "@/server/actions/grid-actions"
import { getCurrentUserId } from "@/server/actions/helpers"

const validConfig = {
  type: "GRID" as const,
  lowerPrice: 90,
  upperPrice: 110,
  gridLevels: 10,
  amountPerOrder: 1000,
  gridDistribution: "ARITHMETIC" as const,
  feeRate: 0.001,
}

const validParams = {
  name: "Test Grid",
  instrument: "SBER",
  instrumentType: "STOCK",
  config: validConfig,
  currentPrice: 100,
}

describe("grid-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateGrid.mockResolvedValue("grid-1")
    mockStopGrid.mockResolvedValue({ cancelledCount: 5, stats: { totalBuys: 3, totalSells: 2, realizedPnl: 150 } })
    mockGetGridStatus.mockResolvedValue({ orders: [], stats: { totalBuys: 3, totalSells: 2, realizedPnl: 150 } })
    mockProcessPriceTick.mockResolvedValue({ filled: [], pnlDelta: 0 })
    mockSuggestParams.mockResolvedValue({
      lowerPrice: 90,
      upperPrice: 110,
      gridLevels: 10,
      amountPerOrder: 1000,
      gridDistribution: "ARITHMETIC",
      feeRate: 0.001,
      reasoning: "ATR-based suggestion",
      expectedProfitPerGrid: 1.5,
      estimatedMonthlyTrades: 20,
    })
  })

  describe("createGridAction", () => {
    it("returns successResponse with gridId on valid input and currentPrice inside range", async () => {
      const res = await createGridAction(validParams)
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.gridId).toBe("grid-1")
    })

    it("returns errorResponse when currentPrice is outside grid range (below)", async () => {
      const res = await createGridAction({ ...validParams, currentPrice: 50 })
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain("within grid range")
    })

    it("returns errorResponse when currentPrice is above grid range", async () => {
      const res = await createGridAction({ ...validParams, currentPrice: 200 })
      expect(res.success).toBe(false)
    })

    it("returns errorResponse on invalid config (upperPrice < lowerPrice)", async () => {
      const badConfig = { ...validConfig, lowerPrice: 200, upperPrice: 100 }
      const res = await createGridAction({ ...validParams, config: badConfig })
      expect(res.success).toBe(false)
    })
  })

  describe("stopGridAction", () => {
    it("calls stopGrid with gridId and userId", async () => {
      const res = await stopGridAction("grid-1")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockStopGrid).toHaveBeenCalledWith("grid-1", "user-1")
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.cancelledCount).toBe(5)
    })
  })

  describe("getGridStatusAction", () => {
    it("returns orders and stats for given gridId", async () => {
      const res = await getGridStatusAction("grid-1")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockGetGridStatus).toHaveBeenCalledWith("grid-1", "user-1")
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.orders).toEqual([])
        expect(res.data.stats.totalBuys).toBe(3)
      }
    })
  })

  describe("processGridTickAction", () => {
    it("processes tick and returns GridTickResult", async () => {
      const res = await processGridTickAction("grid-1", 100)
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockProcessPriceTick).toHaveBeenCalledWith("grid-1", "user-1", 100)
      expect(res.success).toBe(true)
    })
  })

  describe("suggestGridParamsAction", () => {
    it("calls GridAiService.suggestParams and returns suggestion", async () => {
      const res = await suggestGridParamsAction({ instrumentId: "inst-1", instrument: "SBER" })
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockSuggestParams).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.lowerPrice).toBe(90)
    })

    it("returns errorResponse when suggestParams throws", async () => {
      mockSuggestParams.mockRejectedValue(new Error("AI unavailable"))
      const res = await suggestGridParamsAction({ instrumentId: "inst-1", instrument: "SBER" })
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toBe("AI unavailable")
    })
  })
})
