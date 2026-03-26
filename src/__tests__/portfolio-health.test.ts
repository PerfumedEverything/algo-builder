import { describe, it, expect } from "vitest"
import { PortfolioHealthService } from "@/server/services/portfolio-health-service"
import type {
  ConcentrationIndex,
  SectorAllocation,
  BenchmarkComparison,
  PortfolioPosition,
  CorrelationMatrix,
} from "@/core/types"

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

describe("PortfolioHealthService", () => {
  describe("health score", () => {
    it("returns excellent for well-diversified portfolio", () => {
      const result = PortfolioHealthService.computeHealthScore({
        concentration: { hhi: 0.08, level: "diversified", dominantPositions: [] },
        sectorAllocation: [
          { sector: "finance", value: 100, percent: 20, tickers: ["SBER"] },
          { sector: "energy", value: 100, percent: 20, tickers: ["GAZP"] },
          { sector: "tech", value: 100, percent: 20, tickers: ["YNDX"] },
          { sector: "metals", value: 100, percent: 20, tickers: ["GMKN"] },
          { sector: "retail", value: 100, percent: 20, tickers: ["MGNT"] },
        ],
        benchmark: { portfolioReturn: 8, benchmarkReturn: 5, delta: 3, period: 90 },
        highCorrelationCount: 0,
        positionCount: 5,
      })

      expect(result.total).toBeGreaterThanOrEqual(75)
      expect(result.level).toBe("excellent")
    })

    it("returns warning/danger for concentrated portfolio", () => {
      const result = PortfolioHealthService.computeHealthScore({
        concentration: { hhi: 0.30, level: "concentrated", dominantPositions: [{ ticker: "SBER", weight: 0.6 }] },
        sectorAllocation: [
          { sector: "finance", value: 1000, percent: 100, tickers: ["SBER"] },
        ],
        benchmark: { portfolioReturn: -5, benchmarkReturn: 5, delta: -10, period: 90 },
        highCorrelationCount: 5,
        positionCount: 3,
      })

      expect(result.total).toBeLessThanOrEqual(40)
      expect(["warning", "danger"]).toContain(result.level)
    })

    it("returns insufficient_data for < 2 positions", () => {
      const result = PortfolioHealthService.computeHealthScore({
        concentration: { hhi: 1, level: "concentrated", dominantPositions: [] },
        sectorAllocation: [],
        benchmark: null,
        highCorrelationCount: 0,
        positionCount: 1,
      })

      expect(result.total).toBe(0)
      expect(result.level).toBe("insufficient_data")
    })
  })

  describe("diversification advice", () => {
    it("flags position > 30% as danger", () => {
      const positions = [
        makePosition("SBER", "STOCK", 45, 100),
        makePosition("GAZP", "STOCK", 55, 100),
      ]
      const concentration: ConcentrationIndex = { hhi: 0.50, level: "concentrated", dominantPositions: [{ ticker: "GAZP", weight: 0.55 }] }
      const sectors: SectorAllocation[] = [
        { sector: "finance", value: 4500, percent: 45, tickers: ["SBER"] },
        { sector: "energy", value: 5500, percent: 55, tickers: ["GAZP"] },
      ]

      const advice = PortfolioHealthService.generateDiversificationAdvice(positions, concentration, sectors)
      const dangerItems = advice.filter(a => a.level === "danger")
      expect(dangerItems.length).toBeGreaterThanOrEqual(1)
      const sberAdvice = dangerItems.find(a => a.text.includes("SBER") && a.text.includes("45%"))
      expect(sberAdvice).toBeDefined()
      expect(sberAdvice!.text).toContain("25%")
    })

    it("flags sector > 50% as warning", () => {
      const positions = [
        makePosition("SBER", "STOCK", 30, 100),
        makePosition("VTBR", "STOCK", 30, 100),
        makePosition("GAZP", "STOCK", 40, 100),
      ]
      const concentration: ConcentrationIndex = { hhi: 0.20, level: "moderate", dominantPositions: [] }
      const sectors: SectorAllocation[] = [
        { sector: "finance", value: 6000, percent: 60, tickers: ["SBER", "VTBR"] },
        { sector: "energy", value: 4000, percent: 40, tickers: ["GAZP"] },
      ]

      const advice = PortfolioHealthService.generateDiversificationAdvice(positions, concentration, sectors)
      const sectorWarning = advice.find(a => a.text.includes("Финансы"))
      expect(sectorWarning).toBeDefined()
      expect(sectorWarning!.level).toBe("warning")
    })

    it("warns about low sector count (< 3)", () => {
      const positions = [
        makePosition("SBER", "STOCK", 50, 100),
        makePosition("GAZP", "STOCK", 50, 100),
      ]
      const concentration: ConcentrationIndex = { hhi: 0.15, level: "moderate", dominantPositions: [] }
      const sectors: SectorAllocation[] = [
        { sector: "finance", value: 5000, percent: 50, tickers: ["SBER"] },
        { sector: "energy", value: 5000, percent: 50, tickers: ["GAZP"] },
      ]

      const advice = PortfolioHealthService.generateDiversificationAdvice(positions, concentration, sectors)
      const lowCount = advice.find(a => a.text.includes("2 сектора"))
      expect(lowCount).toBeDefined()
    })

    it("returns success for well-diversified portfolio", () => {
      const positions = [
        makePosition("SBER", "STOCK", 20, 100),
        makePosition("GAZP", "STOCK", 20, 100),
        makePosition("YNDX", "STOCK", 20, 100),
        makePosition("GMKN", "STOCK", 20, 100),
        makePosition("MGNT", "STOCK", 20, 100),
      ]
      const concentration: ConcentrationIndex = { hhi: 0.05, level: "diversified", dominantPositions: [] }
      const sectors: SectorAllocation[] = [
        { sector: "finance", value: 2000, percent: 20, tickers: ["SBER"] },
        { sector: "energy", value: 2000, percent: 20, tickers: ["GAZP"] },
        { sector: "tech", value: 2000, percent: 20, tickers: ["YNDX"] },
        { sector: "metals", value: 2000, percent: 20, tickers: ["GMKN"] },
        { sector: "retail", value: 2000, percent: 20, tickers: ["MGNT"] },
      ]

      const advice = PortfolioHealthService.generateDiversificationAdvice(positions, concentration, sectors)
      expect(advice).toHaveLength(1)
      expect(advice[0].level).toBe("success")
    })

    it("hints about missing major sector", () => {
      const positions = [
        makePosition("SBER", "STOCK", 25, 100),
        makePosition("GAZP", "STOCK", 25, 100),
        makePosition("GMKN", "STOCK", 25, 100),
        makePosition("MGNT", "STOCK", 25, 100),
      ]
      const concentration: ConcentrationIndex = { hhi: 0.06, level: "diversified", dominantPositions: [] }
      const sectors: SectorAllocation[] = [
        { sector: "finance", value: 2500, percent: 25, tickers: ["SBER"] },
        { sector: "energy", value: 2500, percent: 25, tickers: ["GAZP"] },
        { sector: "metals", value: 2500, percent: 25, tickers: ["GMKN"] },
        { sector: "retail", value: 2500, percent: 25, tickers: ["MGNT"] },
      ]

      const advice = PortfolioHealthService.generateDiversificationAdvice(positions, concentration, sectors)
      const techMissing = advice.find(a => a.text.includes("IT-сектор"))
      expect(techMissing).toBeDefined()
    })
  })

  describe("benchmark verdict", () => {
    it("returns beats_market when portfolio beats both market and deposit", () => {
      const benchmark: BenchmarkComparison = {
        portfolioReturn: 8,
        benchmarkReturn: 5,
        delta: 3,
        period: 90,
      }
      const result = PortfolioHealthService.enhanceBenchmark(benchmark)
      expect(result.verdict).toBe("beats_market")
      expect(result.verdictText).toContain("обгоняете рынок")
    })

    it("returns beats_deposit when portfolio beats deposit but not market", () => {
      const benchmark: BenchmarkComparison = {
        portfolioReturn: 4,
        benchmarkReturn: 6,
        delta: -2,
        period: 90,
      }
      const result = PortfolioHealthService.enhanceBenchmark(benchmark)
      expect(result.verdict).toBe("beats_deposit")
    })

    it("returns loses_to_deposit when portfolio underperforms deposit", () => {
      const benchmark: BenchmarkComparison = {
        portfolioReturn: 2,
        benchmarkReturn: 6,
        delta: -4,
        period: 90,
      }
      const result = PortfolioHealthService.enhanceBenchmark(benchmark)
      expect(result.verdict).toBe("loses_to_deposit")
      expect(result.verdictText).toContain("Депозит выгоднее")
    })

    it("correctly prorates deposit rate for period", () => {
      const benchmark: BenchmarkComparison = {
        portfolioReturn: 10,
        benchmarkReturn: 5,
        delta: 5,
        period: 365,
      }
      const result = PortfolioHealthService.enhanceBenchmark(benchmark)
      expect(result.depositRateForPeriod).toBeCloseTo(0.15, 5)
      expect(result.depositDelta).toBeCloseTo(10 - 15, 1)
    })
  })

  describe("correlation warnings", () => {
    it("warns about high positive correlation with same sector", () => {
      const highPairs: CorrelationMatrix["highPairs"] = [
        { a: "SBER", b: "VTBR", corr: 0.85 },
      ]

      const warnings = PortfolioHealthService.generateCorrelationWarnings(highPairs)
      expect(warnings).toHaveLength(1)
      expect(warnings[0].text).toContain("SBER")
      expect(warnings[0].text).toContain("VTBR")
      expect(warnings[0].text).toContain("Финансы")
      expect(warnings[0].text).toContain("увеличивает риск")
      expect(warnings[0].isPositive).toBe(true)
    })

    it("warns about high positive correlation without sector note for different sectors", () => {
      const highPairs: CorrelationMatrix["highPairs"] = [
        { a: "SBER", b: "GAZP", corr: 0.75 },
      ]

      const warnings = PortfolioHealthService.generateCorrelationWarnings(highPairs)
      expect(warnings).toHaveLength(1)
      expect(warnings[0].text).toContain("SBER")
      expect(warnings[0].text).toContain("GAZP")
      expect(warnings[0].text).not.toContain("оба")
      expect(warnings[0].text).toContain("увеличивает риск")
    })

    it("notes good diversification for negative correlation", () => {
      const highPairs: CorrelationMatrix["highPairs"] = [
        { a: "SBER", b: "GAZP", corr: -0.75 },
      ]

      const warnings = PortfolioHealthService.generateCorrelationWarnings(highPairs)
      expect(warnings).toHaveLength(1)
      expect(warnings[0].text).toContain("противоположно")
      expect(warnings[0].text).toContain("диверсификации")
      expect(warnings[0].isPositive).toBe(false)
    })

    it("returns empty array when no high pairs", () => {
      const warnings = PortfolioHealthService.generateCorrelationWarnings([])
      expect(warnings).toHaveLength(0)
    })
  })

  describe("edge cases", () => {
    it("performance score returns 50 when no benchmark", () => {
      const result = PortfolioHealthService.computePerformanceScore(null, 0.15)
      expect(result.score).toBe(50)
      expect(result.details).toContain("Нет данных для сравнения")
    })

    it("diversification score clamps to 0-100", () => {
      const result = PortfolioHealthService.computeDiversificationScore(
        { hhi: 0.50, level: "concentrated", dominantPositions: [{ ticker: "X", weight: 0.9 }] },
        [{ sector: "other", value: 100, percent: 100, tickers: ["X"] }],
      )
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it("risk score clamps with many high-corr pairs", () => {
      const result = PortfolioHealthService.computeRiskScore(10)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBe(55)
    })
  })
})
