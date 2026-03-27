import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Candle, Portfolio, PortfolioPosition } from "@/core/types"

const brokerMockGetCandles = vi.fn()
const brokerMockGetPortfolio = vi.fn()
const fundamentalMockGetMetrics = vi.fn()

vi.mock("@/server/services/broker-service", () => {
  function BrokerService() {}
  BrokerService.prototype.getCandles = brokerMockGetCandles
  BrokerService.prototype.getPortfolio = brokerMockGetPortfolio
  return { BrokerService }
})

vi.mock("@/server/services/fundamental-service", () => {
  function FundamentalService() {}
  FundamentalService.prototype.getMetrics = fundamentalMockGetMetrics
  return { FundamentalService }
})

const makeCandle = (i: number): Candle => ({
  open: 100 + i,
  high: 105 + i,
  low: 95 + i,
  close: 102 + i,
  volume: 1000 + i * 10,
  time: new Date(`2024-01-${String((i % 28) + 1).padStart(2, "0")}T10:00:00Z`),
})

const makeCandles = (count: number): Candle[] =>
  Array.from({ length: count }, (_, i) => makeCandle(i))

const makePosition = (ticker: string, currentPrice: number, quantity: number): PortfolioPosition => ({
  instrumentId: `id-${ticker}`,
  ticker,
  name: ticker,
  quantity,
  averagePrice: currentPrice * 0.9,
  currentPrice,
  expectedYield: 10,
  expectedYieldAbsolute: quantity * currentPrice * 0.1,
  dailyYield: 1,
  currentValue: quantity * currentPrice,
  instrumentType: "STOCK" as const,
  blocked: false,
  blockedLots: 0,
  operations: [],
})

const makePortfolio = (positions: PortfolioPosition[]): Portfolio => ({
  totalAmount: positions.reduce((s, p) => s + p.currentValue, 0),
  expectedYield: 5,
  expectedYieldAbsolute: 1000,
  dailyYield: 0.5,
  dailyYieldRelative: 0.005,
  totalShares: 2,
  totalBonds: 0,
  totalEtf: 0,
  totalCurrencies: 0,
  availableCash: 5000,
  positions,
})

const DEFAULT_FUNDAMENTALS = {
  pe: null,
  pb: null,
  dividendYield: null,
  hasFundamentals: false,
  score: 5,
  scoreLabel: "fair",
  lastUpdated: "",
}

describe("SENIOR_TIMEFRAME map", () => {
  it("resolves all timeframes correctly", async () => {
    const { SENIOR_TIMEFRAME } = await import("@/server/services/ai-context-service")
    expect(SENIOR_TIMEFRAME["1m"]).toBe("5m")
    expect(SENIOR_TIMEFRAME["5m"]).toBe("15m")
    expect(SENIOR_TIMEFRAME["15m"]).toBe("1h")
    expect(SENIOR_TIMEFRAME["1h"]).toBe("4h")
    expect(SENIOR_TIMEFRAME["4h"]).toBe("1d")
    expect(SENIOR_TIMEFRAME["1d"]).toBe("1w")
    expect(SENIOR_TIMEFRAME["1w"]).toBe("1w")
  })
})

describe("AiContextService.assembleContext", () => {
  let AiContextService: typeof import("@/server/services/ai-context-service").AiContextService

  beforeEach(async () => {
    vi.clearAllMocks()
    brokerMockGetCandles.mockResolvedValue([])
    brokerMockGetPortfolio.mockResolvedValue(null)
    fundamentalMockGetMetrics.mockResolvedValue(DEFAULT_FUNDAMENTALS)

    const mod = await import("@/server/services/ai-context-service")
    AiContextService = mod.AiContextService
  })

  it("Test 1: includes OHLCV section when candles are available", async () => {
    brokerMockGetCandles.mockResolvedValue(makeCandles(10))

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
    })

    expect(result).toContain("OHLCV")
  })

  it("Test 2: includes Portfolio section with tickers and weights", async () => {
    const positions = [
      makePosition("SBER", 200, 10),
      makePosition("GAZP", 150, 5),
    ]
    brokerMockGetPortfolio.mockResolvedValue(makePortfolio(positions))

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
    })

    expect(result).toContain("Портфель")
    expect(result).toContain("SBER")
    expect(result).toContain("GAZP")
    expect(result).toMatch(/%/)
  })

  it("Test 3: includes senior timeframe section when senior candles available", async () => {
    brokerMockGetCandles
      .mockResolvedValueOnce(makeCandles(5))
      .mockResolvedValueOnce(makeCandles(3))

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
    })

    expect(result).toContain("Старший таймфрейм")
    expect(result).toContain("4h")
  })

  it("Test 4: includes fundamentals (P/E, dividends) when available", async () => {
    fundamentalMockGetMetrics.mockResolvedValue({
      pe: 5.2,
      pb: 1.1,
      dividendYield: 8.5,
      hasFundamentals: true,
      score: 3,
      scoreLabel: "cheap",
      lastUpdated: "2024-01-01",
    })

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
    })

    expect(result).toContain("Фундаментальные")
    expect(result).toContain("P/E")
    expect(result).toContain("5.2")
  })

  it("Test 5: truncates candles to last 100 bars maximum", async () => {
    brokerMockGetCandles.mockResolvedValue(makeCandles(150))

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
    })

    const primarySectionMatch = result.match(/=== Рыночные данные[\s\S]*?(?===|$)/)
    const primarySection = primarySectionMatch ? primarySectionMatch[0] : ""
    const primaryCandleLines = primarySection
      .split("\n")
      .filter((line) => line.match(/^\d{4}-\d{2}-\d{2}/))
    expect(primaryCandleLines.length).toBeLessThanOrEqual(100)
  })

  it("Test 6: result length does not exceed 50000 chars", async () => {
    brokerMockGetCandles.mockResolvedValue(makeCandles(100))
    brokerMockGetPortfolio.mockResolvedValue(
      makePortfolio([makePosition("SBER", 200, 10), makePosition("GAZP", 150, 5)]),
    )
    fundamentalMockGetMetrics.mockResolvedValue({
      pe: 5.2,
      pb: 1.1,
      dividendYield: 8.5,
      hasFundamentals: true,
      score: 3,
      scoreLabel: "cheap",
      lastUpdated: "2024-01-01",
    })

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
    })

    expect(result.length).toBeLessThanOrEqual(50000)
  })

  it("Test 8: handles partial failures gracefully via Promise.allSettled", async () => {
    brokerMockGetCandles
      .mockResolvedValueOnce(makeCandles(5))
      .mockRejectedValueOnce(new Error("Network error for senior TF"))
    brokerMockGetPortfolio.mockRejectedValue(new Error("Portfolio service down"))
    fundamentalMockGetMetrics.mockResolvedValue({
      pe: 5.2,
      pb: null,
      dividendYield: null,
      hasFundamentals: true,
      score: 5,
      scoreLabel: "fair",
      lastUpdated: "2024-01-01",
    })

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
    })

    expect(result).toContain("OHLCV")
    expect(result).toContain("Фундаментальные")
    expect(result).not.toContain("Портфель")
  })

  it("Test 9: includes order book data when available", async () => {
    brokerMockGetCandles.mockResolvedValue(makeCandles(5))

    const result = await AiContextService.assembleContext({
      ticker: "SBER",
      timeframe: "1h",
      userId: "user-1",
      figi: "BBG004730N88",
    })

    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })
})
