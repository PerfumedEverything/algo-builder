import { describe, it, expect, vi, beforeEach } from "vitest"
import { PortfolioAnalyticsService } from "@/server/services/portfolio-analytics-service"
import type { PortfolioPosition, BrokerInstrument } from "@/core/types"

const mockGetPortfolio = vi.fn()
const mockGetCandles = vi.fn()
const mockGetInstruments = vi.fn()

vi.mock("@/server/services/broker-service", () => ({
  BrokerService: class {
    getPortfolio = mockGetPortfolio
    getCandles = mockGetCandles
    getInstruments = mockGetInstruments
  },
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

vi.mock("@/core/data/fundamentals-map", () => ({
  FUNDAMENTALS_MAP: {},
}))

const makePosition = (
  ticker: string,
  instrumentType: string,
  quantity: number,
  currentPrice: number,
): PortfolioPosition => ({
  instrumentId: `id-${ticker}`,
  ticker,
  name: ticker,
  quantity,
  averagePrice: currentPrice,
  currentPrice,
  expectedYield: 0,
  expectedYieldAbsolute: 0,
  dailyYield: 0,
  currentValue: quantity * currentPrice,
  instrumentType,
})

const generateCandles = (days: number, startPrice: number, volatility: number) => {
  const candles = []
  let price = startPrice
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * price
    price = Math.max(price + change, 1)
    candles.push({ open: price, close: price, high: price + 1, low: price - 1, value: 0, volume: 0, begin: "", end: "" })
  }
  return candles
}

describe("Markowitz Optimization", () => {
  let service: PortfolioAnalyticsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PortfolioAnalyticsService()
  })

  const setup3AssetPortfolio = () => {
    const positions = [
      makePosition("SBER", "STOCK", 100, 300),
      makePosition("GAZP", "STOCK", 50, 200),
      makePosition("LKOH", "STOCK", 10, 5000),
    ]
    mockGetPortfolio.mockResolvedValue({ positions })
    mockGetCandles.mockImplementation((_userId: string, params: { instrumentId: string }) => {
      const seed = params.instrumentId === "id-SBER" ? 300 : params.instrumentId === "id-GAZP" ? 200 : 5000
      return Promise.resolve(generateCandles(60, seed, 0.02))
    })
    mockGetInstruments.mockResolvedValue([
      { figi: "f1", ticker: "SBER", name: "Sber", type: "STOCK", currency: "RUB", lot: 10 },
      { figi: "f2", ticker: "GAZP", name: "Gazp", type: "STOCK", currency: "RUB", lot: 10 },
      { figi: "f3", ticker: "LKOH", name: "Lukoil", type: "STOCK", currency: "RUB", lot: 1 },
    ] satisfies BrokerInstrument[])
    return positions
  }

  it("weights sum to 1.0", async () => {
    setup3AssetPortfolio()
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).not.toBeNull()
    const sum = result!.weights.reduce((s, w) => s + w.optimalWeight, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it("all weights are non-negative (long-only)", async () => {
    setup3AssetPortfolio()
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).not.toBeNull()
    for (const w of result!.weights) {
      expect(w.optimalWeight).toBeGreaterThanOrEqual(0)
    }
  })

  it("no single weight exceeds 0.4", async () => {
    setup3AssetPortfolio()
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).not.toBeNull()
    for (const w of result!.weights) {
      expect(w.optimalWeight).toBeLessThanOrEqual(0.4 + 1e-9)
    }
  })

  it("returns null for 1 asset portfolio", async () => {
    mockGetPortfolio.mockResolvedValue({
      positions: [makePosition("SBER", "STOCK", 100, 300)],
    })
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).toBeNull()
  })

  it("returns null when candles have empty returns", async () => {
    const positions = [
      makePosition("SBER", "STOCK", 100, 300),
      makePosition("GAZP", "STOCK", 50, 200),
      makePosition("LKOH", "STOCK", 10, 5000),
    ]
    mockGetPortfolio.mockResolvedValue({ positions })
    mockGetCandles.mockResolvedValue([])
    mockGetInstruments.mockResolvedValue([])
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).toBeNull()
  })

  it("rebalancing actions have correct BUY/SELL direction", async () => {
    setup3AssetPortfolio()
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).not.toBeNull()
    for (const action of result!.rebalancingActions) {
      expect(["BUY", "SELL", "HOLD"]).toContain(action.action)
      if (action.action !== "HOLD") {
        expect(action.lots).toBeGreaterThan(0)
        expect(action.valueRub).toBeGreaterThan(0)
      }
    }
  })

  it("lots are integers (no fractional lots)", async () => {
    setup3AssetPortfolio()
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).not.toBeNull()
    for (const action of result!.rebalancingActions) {
      expect(Number.isInteger(action.lots)).toBe(true)
    }
  })

  it("zero-delta positions get HOLD action", async () => {
    const positions = [
      makePosition("SBER", "STOCK", 100, 300),
      makePosition("GAZP", "STOCK", 50, 200),
      makePosition("LKOH", "STOCK", 10, 5000),
    ]
    mockGetPortfolio.mockResolvedValue({ positions })
    mockGetCandles.mockImplementation((_userId: string, params: { instrumentId: string }) => {
      const seed = params.instrumentId === "id-SBER" ? 300 : params.instrumentId === "id-GAZP" ? 200 : 5000
      return Promise.resolve(generateCandles(60, seed, 0.02))
    })
    mockGetInstruments.mockResolvedValue([
      { figi: "f1", ticker: "SBER", name: "Sber", type: "STOCK", currency: "RUB", lot: 10 },
      { figi: "f2", ticker: "GAZP", name: "Gazp", type: "STOCK", currency: "RUB", lot: 10 },
      { figi: "f3", ticker: "LKOH", name: "Lukoil", type: "STOCK", currency: "RUB", lot: 1 },
    ] satisfies BrokerInstrument[])
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).not.toBeNull()
    for (const action of result!.rebalancingActions) {
      if (action.lots === 0) {
        expect(action.action).toBe("HOLD")
      }
    }
  })

  it("returns null for portfolio with < 2 STOCK/ETF positions", async () => {
    mockGetPortfolio.mockResolvedValue({
      positions: [
        makePosition("SBER", "STOCK", 100, 300),
        makePosition("USD", "CURRENCY", 1000, 90),
      ],
    })
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).toBeNull()
  })

  it("returns sharpe, expectedReturn, expectedVolatility", async () => {
    setup3AssetPortfolio()
    const result = await service.getMarkowitzOptimization("user1", 90)
    expect(result).not.toBeNull()
    expect(typeof result!.sharpe).toBe("number")
    expect(typeof result!.expectedReturn).toBe("number")
    expect(typeof result!.expectedVolatility).toBe("number")
  })
})
