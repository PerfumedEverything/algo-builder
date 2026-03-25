import { describe, it, expect, vi, beforeEach } from "vitest"
import { FundamentalService } from "@/server/services/fundamental-service"
import type { MOEXProvider } from "@/server/providers/analytics/moex-provider"

const makeMockMoex = (dividends: { registryclosedate: string; value: number }[] = []) =>
  ({ getDividends: vi.fn().mockResolvedValue(dividends) }) as unknown as MOEXProvider

describe("FundamentalService.calculateScore", () => {
  let service: FundamentalService

  beforeEach(() => {
    service = new FundamentalService(makeMockMoex())
  })

  it("scores SBER-like values as cheap (score <= 4)", () => {
    const score = service.calculateScore(4.2, 0.9, 8.5, "finance")
    expect(score).toBeLessThanOrEqual(4)
  })

  it("scores expensive values as high (score >= 7)", () => {
    const score = service.calculateScore(25, 5, 1, "tech")
    expect(score).toBeGreaterThanOrEqual(7)
  })

  it("returns score = 5 when all inputs are null", () => {
    const score = service.calculateScore(null, null, null, "finance")
    expect(score).toBe(5)
  })

  it("returns score in 1-10 range", () => {
    const score = service.calculateScore(10, 2, 5, "metals")
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(10)
  })
})

describe("FundamentalService.getMetrics", () => {
  it("returns hasFundamentals=false for unknown ticker", async () => {
    const service = new FundamentalService(makeMockMoex())
    const result = await service.getMetrics("UNKNOWN_TICKER_XYZ", 100)
    expect(result.hasFundamentals).toBe(false)
    expect(result.pe).toBeNull()
    expect(result.pb).toBeNull()
    expect(result.score).toBe(5)
  })

  it("returns hasFundamentals=true with correct P/E for SBER", async () => {
    const recentDate = new Date()
    recentDate.setMonth(recentDate.getMonth() - 3)
    const dividends = [{ registryclosedate: recentDate.toISOString().split("T")[0], value: 25 }]
    const service = new FundamentalService(makeMockMoex(dividends))
    const result = await service.getMetrics("SBER", 270)
    expect(result.hasFundamentals).toBe(true)
    expect(result.pe).toBe(4.2)
    expect(result.pb).toBe(0.9)
    expect(result.scoreLabel).toBe("cheap")
  })

  it("returns hasFundamentals=true for OZON even with null pe/pb", async () => {
    const service = new FundamentalService(makeMockMoex())
    const result = await service.getMetrics("OZON", 3500)
    expect(result.hasFundamentals).toBe(true)
    expect(result.pe).toBeNull()
    expect(result.pb).toBeNull()
  })

  it("handles getDividends failure gracefully (dividendYield=null)", async () => {
    const failingMoex = { getDividends: vi.fn().mockRejectedValue(new Error("network error")) } as unknown as MOEXProvider
    const service = new FundamentalService(failingMoex)
    const result = await service.getMetrics("SBER", 270)
    expect(result.hasFundamentals).toBe(true)
    expect(result.dividendYield).toBeNull()
  })
})
