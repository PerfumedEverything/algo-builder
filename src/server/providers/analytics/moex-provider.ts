import type { MOEXCandle, DividendData } from "@/core/types"
import type { AnalyticsProvider } from "./types"
import { redis } from "@/lib/redis"

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
