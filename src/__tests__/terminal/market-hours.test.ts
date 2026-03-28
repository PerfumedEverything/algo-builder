import { describe, it, expect } from "vitest"
import { isMarketOpen } from "@/lib/market-hours"

describe("isMarketOpen - evening session support", () => {
  it("returns true at 10:00 MSK Monday (main session)", () => {
    expect(isMarketOpen(new Date("2026-03-30T07:00:00Z"))).toBe(true)
  })

  it("returns true at 18:39 MSK Monday (end of main session)", () => {
    expect(isMarketOpen(new Date("2026-03-30T15:39:00Z"))).toBe(true)
  })

  it("returns true at 18:40 MSK Monday (start of evening session)", () => {
    expect(isMarketOpen(new Date("2026-03-30T15:40:00Z"))).toBe(true)
  })

  it("returns true at 19:00 MSK Monday (middle of evening session)", () => {
    expect(isMarketOpen(new Date("2026-03-30T16:00:00Z"))).toBe(true)
  })

  it("returns true at 23:49 MSK Monday (end of evening session)", () => {
    expect(isMarketOpen(new Date("2026-03-30T20:49:00Z"))).toBe(true)
  })

  it("returns false at 23:50 MSK Monday (after evening session)", () => {
    expect(isMarketOpen(new Date("2026-03-30T20:50:00Z"))).toBe(false)
  })

  it("returns false at 09:49 MSK Monday (before pre-open)", () => {
    expect(isMarketOpen(new Date("2026-03-30T06:49:00Z"))).toBe(false)
  })

  it("returns true at 09:50 MSK Monday (pre-open start)", () => {
    expect(isMarketOpen(new Date("2026-03-30T06:50:00Z"))).toBe(true)
  })

  it("returns false on Saturday 12:00 MSK (weekend)", () => {
    expect(isMarketOpen(new Date("2026-03-28T09:00:00Z"))).toBe(false)
  })

  it("returns false on Sunday 19:00 MSK (weekend)", () => {
    expect(isMarketOpen(new Date("2026-03-29T16:00:00Z"))).toBe(false)
  })
})
