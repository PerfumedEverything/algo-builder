import { describe, it, expect, vi, beforeEach } from "vitest"
import { PortfolioAnalyticsService } from "@/server/services/portfolio-analytics-service"
import type { PortfolioPosition } from "@/core/types"

vi.mock("@/server/services/broker-service", () => ({
  BrokerService: class {
    getPortfolio = vi.fn()
    getCandles = vi.fn()
  },
}))

vi.mock("@/server/services/correlation-service", () => ({
  CorrelationService: class {
    getCorrelationMatrix = vi.fn().mockResolvedValue({ matrix: {}, instruments: [] })
  },
}))

vi.mock("@/server/services/portfolio-benchmark-service", () => ({
  getBenchmarkComparison: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/server/services/portfolio-dividend-service", () => ({
  getAggregateDividendYield: vi.fn().mockResolvedValue({ weightedYield: 0, positions: [] }),
}))

vi.mock("@/server/services/operation-service", () => ({
  OperationService: class {
    getStatsForStrategies = vi.fn().mockResolvedValue({})
  },
}))

vi.mock("@/server/repositories/strategy-repository", () => ({
  StrategyRepository: class {
    findByUserId = vi.fn().mockResolvedValue([])
  },
}))

vi.mock("@/server/providers/analytics/moex-provider", () => ({
  MOEXProvider: class {
    getImoexCandles = vi.fn().mockResolvedValue([])
    getDividends = vi.fn().mockResolvedValue([])
  },
}))

vi.mock("simple-statistics", () => ({
  sampleCorrelation: vi.fn().mockReturnValue(0.5),
}))

vi.mock("@/core/data/fundamentals-map", () => ({
  FUNDAMENTALS_MAP: {
    SBER: { sector: "finance" },
    GAZP: { sector: "oil_gas" },
    LKOH: { sector: "oil_gas" },
    YNDX: { sector: "tech" },
  },
}))

const makePosition = (
  ticker: string,
  instrumentType: string,
  quantity: number,
  currentPrice: number,
  averagePrice = currentPrice,
): PortfolioPosition =>
  ({
    ticker,
    instrumentType,
    instrumentId: `id-${ticker}`,
    quantity,
    currentPrice,
    averagePrice,
    name: ticker,
  }) as PortfolioPosition

describe("PortfolioAnalyticsService", () => {
  let service: PortfolioAnalyticsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PortfolioAnalyticsService()
  })

  describe("getConcentrationIndex", () => {
    it("returns diversified for empty positions", () => {
      const result = service.getConcentrationIndex([])
      expect(result.hhi).toBe(0)
      expect(result.level).toBe("diversified")
      expect(result.dominantPositions).toEqual([])
    })

    it("returns concentrated for single position", () => {
      const positions = [makePosition("SBER", "STOCK", 10, 100)]
      const result = service.getConcentrationIndex(positions)
      expect(result.hhi).toBe(1)
      expect(result.level).toBe("concentrated")
    })

    it("returns diversified for evenly spread positions", () => {
      const positions = [
        makePosition("SBER", "STOCK", 10, 100),
        makePosition("GAZP", "STOCK", 10, 100),
        makePosition("LKOH", "STOCK", 10, 100),
        makePosition("YNDX", "STOCK", 10, 100),
        makePosition("VTBR", "STOCK", 10, 100),
        makePosition("MGNT", "STOCK", 10, 100),
        makePosition("POLY", "STOCK", 10, 100),
        makePosition("NLMK", "STOCK", 10, 100),
        makePosition("ROSN", "STOCK", 10, 100),
        makePosition("GMKN", "STOCK", 10, 100),
      ]
      const result = service.getConcentrationIndex(positions)
      expect(result.hhi).toBe(0.1)
      expect(result.level).toBe("diversified")
      expect(result.dominantPositions).toEqual([])
    })

    it("flags dominant position when weight > 40%", () => {
      const positions = [
        makePosition("SBER", "STOCK", 100, 100),
        makePosition("GAZP", "STOCK", 10, 100),
      ]
      const result = service.getConcentrationIndex(positions)
      expect(result.dominantPositions.length).toBe(1)
      expect(result.dominantPositions[0].ticker).toBe("SBER")
    })

    it("classifies moderate concentration correctly", () => {
      const positions = [
        makePosition("SBER", "STOCK", 30, 100),
        makePosition("GAZP", "STOCK", 25, 100),
        makePosition("LKOH", "STOCK", 20, 100),
        makePosition("YNDX", "STOCK", 15, 100),
        makePosition("VTBR", "STOCK", 10, 100),
      ]
      const result = service.getConcentrationIndex(positions)
      expect(result.level).toBe("moderate")
    })
  })

  describe("getSectorAllocation", () => {
    it("returns empty for no positions", () => {
      const result = service.getSectorAllocation([])
      expect(result).toEqual([])
    })

    it("groups positions by sector from FUNDAMENTALS_MAP", () => {
      const positions = [
        makePosition("SBER", "STOCK", 10, 300),
        makePosition("GAZP", "STOCK", 10, 200),
        makePosition("LKOH", "STOCK", 10, 500),
      ]
      const result = service.getSectorAllocation(positions)
      expect(result.length).toBe(2)
      const oilGas = result.find(s => s.sector === "oil_gas")
      expect(oilGas).toBeDefined()
      expect(oilGas!.tickers).toContain("GAZP")
      expect(oilGas!.tickers).toContain("LKOH")
    })

    it("assigns unknown tickers to other sector", () => {
      const positions = [makePosition("UNKNOWN", "STOCK", 10, 100)]
      const result = service.getSectorAllocation(positions)
      expect(result[0].sector).toBe("other")
    })

    it("calculates percentages summing to ~100%", () => {
      const positions = [
        makePosition("SBER", "STOCK", 10, 100),
        makePosition("GAZP", "STOCK", 10, 100),
      ]
      const result = service.getSectorAllocation(positions)
      const totalPercent = result.reduce((sum, s) => sum + s.percent, 0)
      expect(totalPercent).toBeCloseTo(100, 0)
    })
  })

  describe("getAssetTypeBreakdown", () => {
    it("returns empty for no positions", () => {
      const result = service.getAssetTypeBreakdown([])
      expect(result).toEqual([])
    })

    it("groups by instrumentType", () => {
      const positions = [
        makePosition("SBER", "STOCK", 10, 300),
        makePosition("FXUS", "ETF", 20, 50),
        makePosition("SU26238", "BOND", 5, 1000),
      ]
      const result = service.getAssetTypeBreakdown(positions)
      expect(result.length).toBe(3)
      expect(result.map(r => r.type).sort()).toEqual(["BOND", "ETF", "STOCK"])
    })

    it("labels instrumentTypes correctly", () => {
      const positions = [
        makePosition("SBER", "STOCK", 1, 100),
        makePosition("FXUS", "ETF", 1, 100),
      ]
      const result = service.getAssetTypeBreakdown(positions)
      const stock = result.find(r => r.type === "STOCK")
      expect(stock!.label).toBe("Акции")
      const etf = result.find(r => r.type === "ETF")
      expect(etf!.label).toBe("ETF")
    })

    it("calculates count per type", () => {
      const positions = [
        makePosition("SBER", "STOCK", 10, 100),
        makePosition("GAZP", "STOCK", 5, 200),
        makePosition("FXUS", "ETF", 20, 50),
      ]
      const result = service.getAssetTypeBreakdown(positions)
      const stocks = result.find(r => r.type === "STOCK")
      expect(stocks!.count).toBe(2)
    })
  })

  describe("getTradeSuccessBreakdown", () => {
    it("returns empty breakdown when no strategies", async () => {
      const result = await service.getTradeSuccessBreakdown("user-1")
      expect(result.profitable.count).toBe(0)
      expect(result.unprofitable.count).toBe(0)
      expect(result.breakEven.count).toBe(0)
      expect(result.byInstrument).toEqual([])
    })

    it("categorizes profitable, unprofitable, and break-even", async () => {
      const strategies = [
        { id: "s1", instrument: "SBER", name: "SBER Long" },
        { id: "s2", instrument: "GAZP", name: "GAZP Short" },
        { id: "s3", instrument: "LKOH", name: "LKOH Flat" },
      ]
      const stats: Record<string, { pnl: number; totalOperations: number }> = {
        s1: { pnl: 500, totalOperations: 3 },
        s2: { pnl: -200, totalOperations: 2 },
        s3: { pnl: 0, totalOperations: 1 },
      }

      const strategyRepo = (service as unknown as { strategyRepo: { findByUserId: ReturnType<typeof vi.fn> } }).strategyRepo
      strategyRepo.findByUserId.mockResolvedValue(strategies)

      const opService = (service as unknown as { operationService: { getStatsForStrategies: ReturnType<typeof vi.fn> } }).operationService
      opService.getStatsForStrategies.mockResolvedValue(stats)

      const result = await service.getTradeSuccessBreakdown("user-1")
      expect(result.profitable.count).toBe(1)
      expect(result.profitable.totalPnl).toBe(500)
      expect(result.unprofitable.count).toBe(1)
      expect(result.unprofitable.totalPnl).toBe(-200)
      expect(result.breakEven.count).toBe(1)
    })

    it("aggregates by instrument in byInstrument", async () => {
      const strategies = [
        { id: "s1", instrument: "SBER", name: "SBER Long" },
        { id: "s2", instrument: "SBER", name: "SBER Short" },
        { id: "s3", instrument: "GAZP", name: "GAZP Strategy" },
      ]
      const stats: Record<string, { pnl: number; totalOperations: number }> = {
        s1: { pnl: 300, totalOperations: 2 },
        s2: { pnl: -100, totalOperations: 1 },
        s3: { pnl: 50, totalOperations: 3 },
      }

      const strategyRepo = (service as unknown as { strategyRepo: { findByUserId: ReturnType<typeof vi.fn> } }).strategyRepo
      strategyRepo.findByUserId.mockResolvedValue(strategies)

      const opService = (service as unknown as { operationService: { getStatsForStrategies: ReturnType<typeof vi.fn> } }).operationService
      opService.getStatsForStrategies.mockResolvedValue(stats)

      const result = await service.getTradeSuccessBreakdown("user-1")
      expect(result.byInstrument.length).toBe(2)
      const sber = result.byInstrument.find(i => i.ticker === "SBER")
      expect(sber!.totalPnl).toBe(200)
      expect(sber!.strategyCount).toBe(2)
    })

    it("uses batch getStatsForStrategies, not per-strategy calls", async () => {
      const strategies = [
        { id: "s1", instrument: "SBER", name: "S1" },
        { id: "s2", instrument: "GAZP", name: "S2" },
      ]
      const strategyRepo = (service as unknown as { strategyRepo: { findByUserId: ReturnType<typeof vi.fn> } }).strategyRepo
      strategyRepo.findByUserId.mockResolvedValue(strategies)

      const opService = (service as unknown as { operationService: { getStatsForStrategies: ReturnType<typeof vi.fn> } }).operationService
      opService.getStatsForStrategies.mockResolvedValue({})

      await service.getTradeSuccessBreakdown("user-1")
      expect(opService.getStatsForStrategies).toHaveBeenCalledTimes(1)
      expect(opService.getStatsForStrategies).toHaveBeenCalledWith(["s1", "s2"])
    })

    it("skips strategies with zero operations", async () => {
      const strategies = [
        { id: "s1", instrument: "SBER", name: "SBER" },
      ]
      const stats = { s1: { pnl: 100, totalOperations: 0 } }

      const strategyRepo = (service as unknown as { strategyRepo: { findByUserId: ReturnType<typeof vi.fn> } }).strategyRepo
      strategyRepo.findByUserId.mockResolvedValue(strategies)

      const opService = (service as unknown as { operationService: { getStatsForStrategies: ReturnType<typeof vi.fn> } }).operationService
      opService.getStatsForStrategies.mockResolvedValue(stats)

      const result = await service.getTradeSuccessBreakdown("user-1")
      expect(result.profitable.count).toBe(0)
      expect(result.byInstrument.length).toBe(0)
    })
  })

  describe("getCorrelationMatrix", () => {
    it("delegates to CorrelationService with userId and days", async () => {
      const result = await service.getCorrelationMatrix("user-1", 30)
      expect(result).toBeDefined()
      expect(result).toHaveProperty("matrix")
      expect(result).toHaveProperty("instruments")
    })

    it("uses default 90 days when not specified", async () => {
      const correlationService = (service as unknown as { correlationService: { getCorrelationMatrix: ReturnType<typeof vi.fn> } }).correlationService
      await service.getCorrelationMatrix("user-1")
      expect(correlationService.getCorrelationMatrix).toHaveBeenCalledWith("user-1", 90)
    })

    it("returns empty matrix when no instruments (< 2)", async () => {
      const correlationService = (service as unknown as { correlationService: { getCorrelationMatrix: ReturnType<typeof vi.fn> } }).correlationService
      correlationService.getCorrelationMatrix.mockResolvedValue({ matrix: {}, instruments: [] })
      const result = await service.getCorrelationMatrix("user-1")
      expect(result.instruments).toEqual([])
    })
  })

  describe("getBenchmarkComparison", () => {
    it("returns null when fetchBenchmarkComparison returns null (error/no-data case)", async () => {
      const result = await service.getBenchmarkComparison("user-1")
      expect(result).toBeNull()
    })

    it("returns comparison data when available", async () => {
      const { getBenchmarkComparison: fetchMock } = await import("@/server/services/portfolio-benchmark-service")
      const mockFetch = fetchMock as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValueOnce({ portfolioReturn: 5.2, benchmarkReturn: 3.1, alpha: 2.1 })
      const result = await service.getBenchmarkComparison("user-1", 30)
      expect(result).not.toBeNull()
      expect(result!.portfolioReturn).toBe(5.2)
    })

    it("uses default 90 days when not specified", async () => {
      const { getBenchmarkComparison: fetchMock } = await import("@/server/services/portfolio-benchmark-service")
      const mockFetch = fetchMock as ReturnType<typeof vi.fn>
      await service.getBenchmarkComparison("user-1")
      expect(mockFetch).toHaveBeenCalledWith("user-1", 90)
    })
  })

  describe("getAggregateDividendYield", () => {
    it("returns zero yield for empty portfolio", async () => {
      const result = await service.getAggregateDividendYield([])
      expect(result.weightedYield).toBe(0)
    })

    it("delegates to getAggregateDividendYield with positions", async () => {
      const { getAggregateDividendYield: fetchMock } = await import("@/server/services/portfolio-dividend-service")
      const mockFetch = fetchMock as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValueOnce({ weightedYield: 4.5, positions: [{ ticker: "SBER", yield: 4.5 }] })
      const positions = [makePosition("SBER", "STOCK", 10, 300)]
      const result = await service.getAggregateDividendYield(positions)
      expect(result.weightedYield).toBe(4.5)
      expect(mockFetch).toHaveBeenCalledWith(positions)
    })
  })

  describe("edge cases — empty portfolio", () => {
    it("getConcentrationIndex returns diversified with hhi=0 for empty positions", () => {
      const result = service.getConcentrationIndex([])
      expect(result.hhi).toBe(0)
      expect(result.level).toBe("diversified")
      expect(result.dominantPositions).toEqual([])
    })

    it("getSectorAllocation returns empty array for empty positions", () => {
      const result = service.getSectorAllocation([])
      expect(result).toEqual([])
    })

    it("getAssetTypeBreakdown returns empty array for empty positions", () => {
      const result = service.getAssetTypeBreakdown([])
      expect(result).toEqual([])
    })

    it("getTradeSuccessBreakdown returns zero counts for user with no strategies", async () => {
      const result = await service.getTradeSuccessBreakdown("user-no-strategies")
      expect(result.profitable.count).toBe(0)
      expect(result.unprofitable.count).toBe(0)
      expect(result.breakEven.count).toBe(0)
      expect(result.byInstrument).toEqual([])
    })
  })

  describe("error isolation — single method fails", () => {
    it("getTradeSuccessBreakdown handles missing stats entry gracefully", async () => {
      const strategies = [
        { id: "s1", instrument: "SBER", name: "SBER" },
        { id: "s2", instrument: "GAZP", name: "GAZP" },
      ]
      const strategyRepo = (service as unknown as { strategyRepo: { findByUserId: ReturnType<typeof vi.fn> } }).strategyRepo
      strategyRepo.findByUserId.mockResolvedValue(strategies)
      const opService = (service as unknown as { operationService: { getStatsForStrategies: ReturnType<typeof vi.fn> } }).operationService
      opService.getStatsForStrategies.mockResolvedValue({ s1: { pnl: 100, totalOperations: 2 } })

      const result = await service.getTradeSuccessBreakdown("user-1")
      expect(result.profitable.count).toBe(1)
      expect(result.byInstrument.length).toBe(1)
    })
  })
})
