import type { AiContextParams } from "@/server/providers/ai/types"
import type { Candle, Portfolio } from "@/core/types"
import { BrokerService } from "./broker-service"
import { FundamentalService } from "./fundamental-service"

export const SENIOR_TIMEFRAME: Record<string, string> = {
  "1m": "5m",
  "5m": "15m",
  "15m": "1h",
  "1h": "4h",
  "4h": "1d",
  "1d": "1w",
  "1w": "1w",
}

const MAX_CONTEXT_CHARS = 50000
const MAX_CANDLES = 100
const MAX_SENIOR_CANDLES = 50

function getCandleFromDate(timeframe: string): Date {
  const now = new Date()
  const msPerBar: Record<string, number> = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
    "1w": 604_800_000,
  }
  const ms = msPerBar[timeframe] ?? 3_600_000
  return new Date(now.getTime() - ms * (MAX_CANDLES + 10))
}

function getSeniorFromDate(timeframe: string): Date {
  const now = new Date()
  const msPerBar: Record<string, number> = {
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
    "1w": 604_800_000,
  }
  const ms = msPerBar[timeframe] ?? 86_400_000
  return new Date(now.getTime() - ms * (MAX_SENIOR_CANDLES + 10))
}

function formatCandles(candles: Candle[], max: number): string {
  const sliced = candles.slice(-max)
  return sliced
    .map((c) => {
      const d = c.time instanceof Date ? c.time.toISOString().split("T")[0] : String(c.time)
      return `${d} O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)} V:${c.volume}`
    })
    .join("\n")
}

function formatPortfolio(portfolio: Portfolio): string {
  const totalValue = portfolio.totalAmount || 1
  const lines = portfolio.positions.map((p) => {
    const weight = ((p.currentValue / totalValue) * 100).toFixed(1)
    const pnl = p.expectedYieldAbsolute >= 0 ? `+${p.expectedYieldAbsolute.toFixed(0)}₽` : `${p.expectedYieldAbsolute.toFixed(0)}₽`
    return `${p.ticker} — ${weight}%, P&L: ${pnl}`
  })
  return lines.join("\n")
}

export class AiContextService {
  static async assembleContext(params: AiContextParams): Promise<string> {
    const { ticker, timeframe, userId, figi } = params
    const seniorTF = SENIOR_TIMEFRAME[timeframe] ?? "1d"
    const broker = new BrokerService()
    const fundamentalService = new FundamentalService()

    const now = new Date()

    const [candlesResult, seniorCandlesResult, portfolioResult, fundamentalsResult] =
      await Promise.allSettled([
        broker.getCandles(userId, {
          instrumentId: figi ?? ticker,
          from: getCandleFromDate(timeframe),
          to: now,
          interval: timeframe,
        }),
        broker.getCandles(userId, {
          instrumentId: figi ?? ticker,
          from: getSeniorFromDate(seniorTF),
          to: now,
          interval: seniorTF,
        }),
        broker.getPortfolio(userId),
        fundamentalService.getMetrics(ticker, 0),
      ])

    const sections: string[] = []

    if (candlesResult.status === "fulfilled" && candlesResult.value.length > 0) {
      const candles = candlesResult.value
      sections.push(
        `=== Рыночные данные (${ticker}, ${timeframe}) ===\n` +
        `Последние ${Math.min(candles.length, MAX_CANDLES)} свечей OHLCV:\n` +
        formatCandles(candles, MAX_CANDLES),
      )
    }

    if (seniorCandlesResult.status === "fulfilled" && seniorCandlesResult.value.length > 0) {
      const sc = seniorCandlesResult.value
      sections.push(
        `=== Старший таймфрейм (${seniorTF}) ===\n` +
        `Последние ${Math.min(sc.length, MAX_SENIOR_CANDLES)} свечей OHLCV:\n` +
        formatCandles(sc, MAX_SENIOR_CANDLES),
      )
    }

    if (portfolioResult.status === "fulfilled" && portfolioResult.value !== null) {
      const portfolio = portfolioResult.value as Portfolio
      sections.push(
        `=== Портфель пользователя ===\n` +
        formatPortfolio(portfolio),
      )
    }

    if (fundamentalsResult.status === "fulfilled") {
      const f = fundamentalsResult.value
      if (f.hasFundamentals) {
        const lines: string[] = [`=== Фундаментальные данные (${ticker}) ===`]
        if (f.pe !== null) lines.push(`P/E: ${f.pe}`)
        if (f.pb !== null) lines.push(`P/B: ${f.pb}`)
        if (f.dividendYield !== null) lines.push(`Дивидендная доходность: ${f.dividendYield.toFixed(1)}%`)
        sections.push(lines.join("\n"))
      }
    }

    let result = sections.join("\n\n")

    if (result.length > MAX_CONTEXT_CHARS) {
      result = result.slice(0, MAX_CONTEXT_CHARS)
    }

    return result
  }
}
