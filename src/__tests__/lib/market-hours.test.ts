import { describe, it, expect } from "vitest"
import { isMarketOpen } from "@/lib/market-hours"

describe("isMarketOpen", () => {
  it("returns true for Wednesday 12:00 MSK (UTC 09:00)", () => {
    const date = new Date("2025-01-15T09:00:00Z")
    expect(isMarketOpen(date)).toBe(true)
  })

  it("returns false for Wednesday 06:00 MSK (UTC 03:00, before 09:50)", () => {
    const date = new Date("2025-01-15T03:00:00Z")
    expect(isMarketOpen(date)).toBe(false)
  })

  it("returns false for Wednesday 19:00 MSK (UTC 16:00, after 18:50)", () => {
    const date = new Date("2025-01-15T16:00:00Z")
    expect(isMarketOpen(date)).toBe(false)
  })

  it("returns false for Saturday 12:00 MSK", () => {
    const date = new Date("2025-01-18T09:00:00Z")
    expect(isMarketOpen(date)).toBe(false)
  })

  it("returns false for Sunday 12:00 MSK", () => {
    const date = new Date("2025-01-19T09:00:00Z")
    expect(isMarketOpen(date)).toBe(false)
  })

  it("returns true for Monday 09:50 MSK (boundary — inclusive)", () => {
    const date = new Date("2025-01-20T06:50:00Z")
    expect(isMarketOpen(date)).toBe(true)
  })

  it("returns false for Friday 18:50 MSK (boundary — exclusive)", () => {
    const date = new Date("2025-01-24T15:50:00Z")
    expect(isMarketOpen(date)).toBe(false)
  })
})
