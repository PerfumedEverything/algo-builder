import { describe, it, expect } from "vitest"
import { cleanTicker } from "@/lib/ticker-utils"

describe("cleanTicker", () => {
  it("strips trailing @ from ticker", () => {
    expect(cleanTicker("SBER@")).toBe("SBER")
  })

  it("returns ticker unchanged when no trailing @", () => {
    expect(cleanTicker("GAZP")).toBe("GAZP")
  })

  it("only strips trailing @ not mid-string @", () => {
    expect(cleanTicker("SBER@TQBR")).toBe("SBER@TQBR")
  })

  it("handles empty string safely", () => {
    expect(cleanTicker("")).toBe("")
  })

  it("handles ticker with only @", () => {
    expect(cleanTicker("@")).toBe("")
  })

  it("strips trailing @ from TGLD@", () => {
    expect(cleanTicker("TGLD@")).toBe("TGLD")
  })

  it("returns SBER unchanged when no trailing @", () => {
    expect(cleanTicker("SBER")).toBe("SBER")
  })

  it("handles empty string without crash", () => {
    expect(cleanTicker("")).toBe("")
  })

  it("strips trailing @ from GAZP@", () => {
    expect(cleanTicker("GAZP@")).toBe("GAZP")
  })
})
