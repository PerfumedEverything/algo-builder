import { describe, it, expect } from "vitest"
import { parseTopMoversResponse } from "@/server/providers/analytics/moex-provider"

const marketdataCols = ["SECID", "LAST", "LASTCHANGEPRCNT", "VOLTODAY", "HIGH", "LOW"]
const securitiesCols = ["SECID", "SHORTNAME"]

const makeMarketRow = (secid: string, last: number | null, changePct: number | null, vol = 1000, high = 0, low = 0): unknown[] =>
  [secid, last, changePct, vol, high, low]

const makeSecRow = (secid: string, shortName: string): unknown[] =>
  [secid, shortName]

describe("parseTopMoversResponse", () => {
  it("correctly joins SECID to SHORTNAME from securities block", () => {
    const marketdata = [makeMarketRow("SBER", 300, 2.5)]
    const securities = [makeSecRow("SBER", "Сбербанк")]

    const result = parseTopMoversResponse(marketdata, securities, 5)

    expect(result.gainers[0].shortName).toBe("Сбербанк")
    expect(result.gainers[0].ticker).toBe("SBER")
  })

  it("uses ticker as fallback when SHORTNAME is missing", () => {
    const marketdata = [makeMarketRow("UNKNOWN", 100, 1.5)]
    const securities: unknown[][] = []

    const result = parseTopMoversResponse(marketdata, securities, 5)

    expect(result.gainers[0].shortName).toBe("UNKNOWN")
  })

  it("filters out rows with null LAST", () => {
    const marketdata = [
      makeMarketRow("SBER", null, 2.5),
      makeMarketRow("GAZP", 200, 1.0),
    ]
    const securities = [makeSecRow("SBER", "Сбербанк"), makeSecRow("GAZP", "Газпром")]

    const result = parseTopMoversResponse(marketdata, securities, 5)

    expect(result.gainers).toHaveLength(1)
    expect(result.gainers[0].ticker).toBe("GAZP")
  })

  it("filters out rows with null LASTCHANGEPRCNT", () => {
    const marketdata = [
      makeMarketRow("SBER", 300, null),
      makeMarketRow("GAZP", 200, 1.0),
    ]
    const securities = [makeSecRow("SBER", "Сбербанк"), makeSecRow("GAZP", "Газпром")]

    const result = parseTopMoversResponse(marketdata, securities, 5)

    expect(result.gainers).toHaveLength(1)
    expect(result.gainers[0].ticker).toBe("GAZP")
  })

  it("sorts gainers by LASTCHANGEPRCNT descending", () => {
    const marketdata = [
      makeMarketRow("A", 100, 1.0),
      makeMarketRow("B", 200, 5.0),
      makeMarketRow("C", 150, 3.0),
    ]
    const securities = [makeSecRow("A", "A"), makeSecRow("B", "B"), makeSecRow("C", "C")]

    const result = parseTopMoversResponse(marketdata, securities, 5)

    expect(result.gainers[0].ticker).toBe("B")
    expect(result.gainers[1].ticker).toBe("C")
    expect(result.gainers[2].ticker).toBe("A")
  })

  it("losers are the most negative LASTCHANGEPRCNT values", () => {
    const marketdata = [
      makeMarketRow("A", 100, 1.0),
      makeMarketRow("B", 200, -5.0),
      makeMarketRow("C", 150, -3.0),
    ]
    const securities = [makeSecRow("A", "A"), makeSecRow("B", "B"), makeSecRow("C", "C")]

    const result = parseTopMoversResponse(marketdata, securities, 5)

    expect(result.losers[0].ticker).toBe("B")
    expect(result.losers[0].changePct).toBe(-5.0)
  })

  it("respects topN=3 and returns correct count", () => {
    const marketdata = Array.from({ length: 10 }, (_, i) =>
      makeMarketRow(`T${i}`, 100 + i, (5 - i) as number),
    )
    const securities = marketdata.map((row) => makeSecRow(row[0] as string, `Name${row[0]}`))

    const result = parseTopMoversResponse(marketdata, securities, 3)

    expect(result.gainers).toHaveLength(3)
    expect(result.losers).toHaveLength(3)
  })

  it("maps to correct TopMover shape with all fields", () => {
    const marketdata = [makeMarketRow("SBER", 300.5, 2.5, 5000, 310, 295)]
    const securities = [makeSecRow("SBER", "Сбербанк")]

    const result = parseTopMoversResponse(marketdata, securities, 5)
    const mover = result.gainers[0]

    expect(mover).toMatchObject({
      ticker: "SBER",
      shortName: "Сбербанк",
      price: 300.5,
      changePct: 2.5,
      volume: 5000,
      high: 310,
      low: 295,
    })
  })
})
