import { describe, it, expect } from "vitest"
import {
  formatPrice,
  formatVolume,
  formatChange,
  formatSpread,
  getChangeColor,
} from "@/lib/terminal-utils"

describe("formatPrice", () => {
  it("formats number with 2 decimal places and comma", () => {
    expect(formatPrice(250.5)).toBe("250,50")
  })

  it("formats large number with thousands separator (space)", () => {
    expect(formatPrice(1234.5)).toBe("1\u00a0234,50")
  })

  it("formats zero as 0,00", () => {
    expect(formatPrice(0)).toBe("0,00")
  })

  it("formats integer with 2 decimal places", () => {
    expect(formatPrice(100)).toBe("100,00")
  })

  it("formats large price with multiple thousands separators", () => {
    expect(formatPrice(1234567.89)).toBe("1\u00a0234\u00a0567,89")
  })
})

describe("formatVolume", () => {
  it("abbreviates millions with one decimal", () => {
    expect(formatVolume(1200000)).toBe("1,2M")
  })

  it("abbreviates hundreds of thousands with K suffix", () => {
    expect(formatVolume(500000)).toBe("500K")
  })

  it("formats numbers under 10K with thousands separator", () => {
    expect(formatVolume(1500)).toBe("1\u00a0500")
  })

  it("formats zero as 0", () => {
    expect(formatVolume(0)).toBe("0")
  })

  it("abbreviates exactly 1M correctly", () => {
    expect(formatVolume(1000000)).toBe("1M")
  })

  it("abbreviates numbers just above 10K with K", () => {
    expect(formatVolume(10000)).toBe("10K")
  })
})

describe("formatChange", () => {
  it("prefixes positive values with + sign", () => {
    expect(formatChange(1.23)).toBe("+1,23%")
  })

  it("prefixes negative values with - sign", () => {
    expect(formatChange(-0.5)).toBe("-0,50%")
  })

  it("formats zero as 0,00%", () => {
    expect(formatChange(0)).toBe("0,00%")
  })

  it("formats large positive change", () => {
    expect(formatChange(10.5)).toBe("+10,50%")
  })

  it("does not double the minus sign for negative values", () => {
    const result = formatChange(-1.23)
    expect(result.startsWith("-")).toBe(true)
    expect(result.indexOf("-")).toBe(0)
    expect(result.lastIndexOf("-")).toBe(0)
  })
})

describe("formatSpread", () => {
  it("formats spread with 2 decimal places", () => {
    expect(formatSpread(0.05)).toBe("0,05")
  })

  it("formats zero spread as 0,00", () => {
    expect(formatSpread(0)).toBe("0,00")
  })

  it("formats spread with comma decimal separator", () => {
    expect(formatSpread(1.5)).toBe("1,50")
  })
})

describe("getChangeColor", () => {
  it("returns green for positive values", () => {
    expect(getChangeColor(1.23)).toBe("text-emerald-500")
  })

  it("returns red for negative values", () => {
    expect(getChangeColor(-0.5)).toBe("text-red-500")
  })

  it("returns muted for zero", () => {
    expect(getChangeColor(0)).toBe("text-muted-foreground")
  })
})
