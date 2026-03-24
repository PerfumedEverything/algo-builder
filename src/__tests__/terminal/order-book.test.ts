import { describe, it, expect } from "vitest"
import { toNumber, mapOrderBookResponse } from "@/lib/order-book-utils"

describe("toNumber", () => {
  it("converts Quotation with units and nano to number", () => {
    expect(toNumber({ units: 100, nano: 500_000_000 })).toBeCloseTo(100.5)
  })

  it("returns 0 for zero Quotation", () => {
    expect(toNumber({ units: 0, nano: 0 })).toBe(0)
  })

  it("returns 0 for undefined", () => {
    expect(toNumber(undefined)).toBe(0)
  })

  it("handles nano precision correctly", () => {
    expect(toNumber({ units: 0, nano: 1 })).toBeCloseTo(0.000000001)
  })

  it("handles large units", () => {
    expect(toNumber({ units: 999, nano: 0 })).toBe(999)
  })
})

describe("mapOrderBookResponse", () => {
  it("maps bids and asks from Quotation format to OrderBookLevel", () => {
    const bids = [
      { price: { units: 100, nano: 0 }, quantity: 10 },
      { price: { units: 99, nano: 500_000_000 }, quantity: 5 },
    ]
    const asks = [
      { price: { units: 101, nano: 0 }, quantity: 8 },
      { price: { units: 102, nano: 0 }, quantity: 3 },
    ]

    const result = mapOrderBookResponse(bids, asks)

    expect(result.bids).toHaveLength(2)
    expect(result.bids[0]).toEqual({ price: 100, quantity: 10 })
    expect(result.bids[1]).toEqual({ price: 99.5, quantity: 5 })
    expect(result.asks).toHaveLength(2)
    expect(result.asks[0]).toEqual({ price: 101, quantity: 8 })
  })

  it("calculates spread as asks[0].price - bids[0].price", () => {
    const bids = [{ price: { units: 100, nano: 0 }, quantity: 1 }]
    const asks = [{ price: { units: 101, nano: 0 }, quantity: 1 }]

    const result = mapOrderBookResponse(bids, asks)

    expect(result.spread).toBeCloseTo(1)
  })

  it("returns spread of 0 for empty bids", () => {
    const asks = [{ price: { units: 101, nano: 0 }, quantity: 1 }]

    const result = mapOrderBookResponse([], asks)

    expect(result.spread).toBe(0)
  })

  it("returns spread of 0 for empty asks", () => {
    const bids = [{ price: { units: 100, nano: 0 }, quantity: 1 }]

    const result = mapOrderBookResponse(bids, [])

    expect(result.spread).toBe(0)
  })

  it("returns empty arrays and spread 0 for empty bids and asks", () => {
    const result = mapOrderBookResponse([], [])

    expect(result.bids).toEqual([])
    expect(result.asks).toEqual([])
    expect(result.spread).toBe(0)
  })
})
