import OpenAI from "openai"
import type { Candle } from "@/core/types"
import { IndicatorCalculator } from "./indicator-calculator"
import { BrokerService } from "./broker-service"
import { getEnv } from "@/core/config/env"

export type GridSuggestion = {
  lowerPrice: number
  upperPrice: number
  gridLevels: number
  amountPerOrder: number
  gridDistribution: "ARITHMETIC" | "GEOMETRIC"
  feeRate: number
  reasoning: string
  expectedProfitPerGrid: number
  estimatedMonthlyTrades: number
}

const MIN_RANGE_PCT = 0.04
const MIN_LEVELS = 5
const MAX_LEVELS = 30
const DEFAULT_AMOUNT = 10
const DEFAULT_FEE_RATE = 0.001
const ATR_PERIOD = 14
const ATR_MULTIPLIER = 2

function roundToSigFigs(value: number, precision: number): number {
  if (value === 0) return 0
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

function getPricePrecision(price: number): number {
  if (price >= 10000) return 0
  if (price >= 1000) return 1
  if (price >= 100) return 2
  if (price >= 10) return 3
  if (price >= 1) return 4
  return 6
}

function estimateMonthlyTrades(candles: Candle[], atr: number): number {
  if (candles.length < 2 || atr === 0) return 0
  let crossings = 0
  for (let i = 1; i < candles.length; i++) {
    const priceMove = Math.abs(candles[i].close - candles[i - 1].close)
    crossings += Math.floor(priceMove / atr)
  }
  const lookbackHours = candles.length
  if (lookbackHours === 0) return 0
  const hoursPerMonth = 720
  return Math.round((crossings / lookbackHours) * hoursPerMonth)
}

async function getAiReasoning(
  instrument: string,
  atr: number,
  currentPrice: number,
  periodHigh: number,
  periodLow: number,
  lowerPrice: number,
  upperPrice: number,
  gridLevels: number,
): Promise<string> {
  const fallback = `Диапазон рассчитан на основе ATR(14) = ${atr.toFixed(4)}. Охватывает ${ATR_MULTIPLIER} ATR от текущей цены (${currentPrice.toFixed(4)}) в обе стороны.`

  try {
    const env = getEnv()
    if (env.AI_PROVIDER !== "deepseek" || !env.DEEPSEEK_API_KEY) return fallback

    const client = new OpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: env.DEEPSEEK_BASE_URL })
    const prompt =
      `Analyze ${instrument} for grid trading. ATR(14)=${atr.toFixed(4)}, ` +
      `range=${periodLow.toFixed(4)}-${periodHigh.toFixed(4)}, current=${currentPrice.toFixed(4)}. ` +
      `Explain in 2-3 sentences why the suggested range of ${lowerPrice.toFixed(4)}-${upperPrice.toFixed(4)} ` +
      `with ${gridLevels} levels is appropriate. Respond in Russian.`

    const response = await Promise.race([
      client.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 200,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ])

    const text = response.choices[0]?.message?.content?.trim()
    return text ?? fallback
  } catch {
    return fallback
  }
}

export class GridAiService {
  static async suggestParams(params: {
    instrumentId: string
    instrument: string
    userId: string
    lookbackDays?: number
  }): Promise<GridSuggestion> {
    const lookbackDays = params.lookbackDays ?? 30
    const broker = new BrokerService()

    const from = new Date(Date.now() - lookbackDays * 24 * 3600 * 1000)
    const to = new Date()

    const candles = await broker.getCandles(params.userId, {
      instrumentId: params.instrumentId,
      from,
      to,
      interval: "1h",
    })

    if (candles.length < ATR_PERIOD + 1) {
      throw new Error(`Insufficient candle data: got ${candles.length}, need at least ${ATR_PERIOD + 1}`)
    }

    const atrRaw = IndicatorCalculator.calculateATR(candles, ATR_PERIOD)
    if (atrRaw === null) {
      throw new Error("ATR calculation failed — not enough stable candles")
    }

    const currentPrice = candles[candles.length - 1].close
    const periodHigh = Math.max(...candles.map((c) => c.high))
    const periodLow = Math.min(...candles.map((c) => c.low))

    const precision = getPricePrecision(currentPrice)

    let lowerPrice = roundToSigFigs(currentPrice - ATR_MULTIPLIER * atrRaw, precision)
    let upperPrice = roundToSigFigs(currentPrice + ATR_MULTIPLIER * atrRaw, precision)

    const minRange = currentPrice * MIN_RANGE_PCT
    if (upperPrice - lowerPrice < minRange) {
      const half = minRange / 2
      lowerPrice = roundToSigFigs(currentPrice - half, precision)
      upperPrice = roundToSigFigs(currentPrice + half, precision)
    }

    if (lowerPrice <= 0) {
      lowerPrice = roundToSigFigs(currentPrice * 0.02, precision)
    }

    const priceRange = upperPrice - lowerPrice
    const rawLevels = Math.round(priceRange / (atrRaw * 0.5))
    const gridLevels = Math.max(MIN_LEVELS, Math.min(MAX_LEVELS, rawLevels))

    const step = priceRange / gridLevels
    const expectedProfitPerGrid = (step / lowerPrice) * 100 - DEFAULT_FEE_RATE * 200

    const estimatedMonthlyTrades = estimateMonthlyTrades(candles, atrRaw)

    const reasoning = await getAiReasoning(
      params.instrument,
      atrRaw,
      currentPrice,
      periodHigh,
      periodLow,
      lowerPrice,
      upperPrice,
      gridLevels,
    )

    return {
      lowerPrice,
      upperPrice,
      gridLevels,
      amountPerOrder: DEFAULT_AMOUNT,
      gridDistribution: "ARITHMETIC",
      feeRate: DEFAULT_FEE_RATE,
      reasoning,
      expectedProfitPerGrid: Math.max(0, roundToSigFigs(expectedProfitPerGrid, 4)),
      estimatedMonthlyTrades,
    }
  }
}
