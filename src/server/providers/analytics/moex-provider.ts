import type { MOEXCandle, DividendData, TopMover } from "@/core/types"
import type { AnalyticsProvider } from "./types"
import { redis } from "@/lib/redis"

type TopMoverRaw = {
  SECID: string
  LAST: number | null
  LASTCHANGEPRCNT: number | null
  VOLTODAY: number | null
  HIGH: number | null
  LOW: number | null
}

type TopMoverNameRaw = {
  SECID: string
  SHORTNAME: string
}

const mapColumnsToObject = <T>(columns: string[], row: unknown[]): T => {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => {
    obj[col] = row[i]
  })
  return obj as T
}

export class MOEXProvider implements AnalyticsProvider {
  private baseUrl = "https://iss.moex.com/iss"

  async getImoexCandles(from: string, till: string): Promise<MOEXCandle[]> {
    const cacheKey = `moex:imoex:candles:${from}:${till}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as MOEXCandle[]

    const url = `${this.baseUrl}/engines/stock/markets/index/securities/IMOEX/candles.json?from=${encodeURIComponent(from)}&till=${encodeURIComponent(till)}&interval=24&iss.meta=off`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`MOEX API error: ${res.status} ${res.statusText}`)
    const json = await res.json()
    const { columns, data } = json.candles
    const candles = (data as unknown[][]).map((row) => mapColumnsToObject<MOEXCandle>(columns, row))

    await redis.set(cacheKey, JSON.stringify(candles), "EX", 86400)
    return candles
  }

  async getDividends(ticker: string): Promise<DividendData[]> {
    if (!/^[A-Z0-9]{1,12}$/.test(ticker)) throw new Error(`Invalid ticker: ${ticker}`)
    const cacheKey = `moex:dividends:${ticker}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as DividendData[]

    const url = `${this.baseUrl}/securities/${encodeURIComponent(ticker)}/dividends.json?iss.meta=off`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`MOEX API error: ${res.status} ${res.statusText}`)
    const json = await res.json()
    const { columns, data } = json.dividends
    const dividends = (data as unknown[][]).map((row) => mapColumnsToObject<DividendData>(columns, row))

    await redis.set(cacheKey, JSON.stringify(dividends), "EX", 604800)
    return dividends
  }

  async getTopMovers(topN = 5): Promise<{ gainers: TopMover[]; losers: TopMover[] }> {
    const cacheKey = "moex:top-movers"
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as { gainers: TopMover[]; losers: TopMover[] }

    const url = `${this.baseUrl}/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&marketdata.columns=SECID,LAST,LASTCHANGEPRCNT,VOLTODAY,HIGH,LOW&securities.columns=SECID,SHORTNAME`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`MOEX API error: ${res.status} ${res.statusText}`)
    const json = await res.json()

    const { columns: mdCols, data: mdData } = json.marketdata as { columns: string[]; data: unknown[][] }
    const { columns: secCols, data: secData } = json.securities as { columns: string[]; data: unknown[][] }

    const rows = (mdData as unknown[][]).map((row) => mapColumnsToObject<TopMoverRaw>(mdCols, row))
    const nameRows = (secData as unknown[][]).map((row) => mapColumnsToObject<TopMoverNameRaw>(secCols, row))
    const nameMap: Record<string, string> = {}
    for (const n of nameRows) nameMap[n.SECID] = n.SHORTNAME

    const result = buildTopMovers(rows, nameMap, topN)
    await redis.set(cacheKey, JSON.stringify(result), "EX", 60)
    return result
  }

  async getHistoryWithPagination(url: string): Promise<unknown[][]> {
    const allRows: unknown[][] = []
    let start = 0

    while (true) {
      const separator = url.includes("?") ? "&" : "?"
      const pageUrl = `${url}${separator}start=${start}&iss.meta=off`
      const res = await fetch(pageUrl)
      if (!res.ok) throw new Error(`MOEX API error: ${res.status} ${res.statusText}`)
      const json = await res.json()

      const rows = json.history?.data as unknown[][] | undefined
      if (!rows || rows.length === 0) break
      allRows.push(...rows)

      const cursor = json["history.cursor"]?.data as unknown[][] | undefined
      if (!cursor || cursor.length === 0) break

      const [index, total, pageSize] = cursor[0] as [number, number, number]
      if (index + pageSize >= total) break
      start = index + pageSize
    }

    return allRows
  }
}

const MD_COLS = ["SECID", "LAST", "LASTCHANGEPRCNT", "VOLTODAY", "HIGH", "LOW"]
const SEC_COLS = ["SECID", "SHORTNAME"]

const colsToObj = <T>(columns: string[], row: unknown[]): T => {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => { obj[col] = row[i] })
  return obj as T
}

const buildTopMovers = (rows: TopMoverRaw[], nameMap: Record<string, string>, topN: number): { gainers: TopMover[]; losers: TopMover[] } => {
  const valid = rows.filter((r) => r.LAST !== null && r.LASTCHANGEPRCNT !== null)
  valid.sort((a, b) => (b.LASTCHANGEPRCNT ?? 0) - (a.LASTCHANGEPRCNT ?? 0))
  const toMover = (r: TopMoverRaw): TopMover => ({ ticker: r.SECID, shortName: nameMap[r.SECID] ?? r.SECID, price: r.LAST!, changePct: r.LASTCHANGEPRCNT!, volume: r.VOLTODAY ?? 0, high: r.HIGH ?? 0, low: r.LOW ?? 0 })
  return { gainers: valid.slice(0, topN).map(toMover), losers: valid.slice(-topN).reverse().map(toMover) }
}

export const parseTopMoversResponse = (marketdata: unknown[][], securities: unknown[][], topN: number): { gainers: TopMover[]; losers: TopMover[] } => {
  const rows = marketdata.map((row) => colsToObj<TopMoverRaw>(MD_COLS, row))
  const nameMap: Record<string, string> = {}
  for (const row of securities) { const o = colsToObj<TopMoverNameRaw>(SEC_COLS, row); nameMap[o.SECID] = o.SHORTNAME }
  return buildTopMovers(rows, nameMap, topN)
}
