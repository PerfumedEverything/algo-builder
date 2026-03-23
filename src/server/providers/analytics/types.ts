import type { MOEXCandle, DividendData } from "@/core/types"

export type AnalyticsProvider = {
  getImoexCandles(from: string, till: string): Promise<MOEXCandle[]>
  getDividends(ticker: string): Promise<DividendData[]>
  getHistoryWithPagination(url: string): Promise<unknown[][]>
}
