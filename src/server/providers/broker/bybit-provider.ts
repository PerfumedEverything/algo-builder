import { RestClientV5, type KlineIntervalV3, type PositionV5 } from "bybit-api"
import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  PlaceOrderParams,
  Portfolio,
  PortfolioPosition,
} from "@/core/types"
import type { BrokerProvider } from "./types"
import { BYBIT_CRYPTO_PAIRS, BYBIT_INTERVAL_MAP } from "./bybit-constants"

const mapPosition = (p: PositionV5): PortfolioPosition => {
  const quantity = parseFloat(p.size ?? "0")
  const averagePrice = parseFloat(p.avgPrice ?? "0")
  const currentPrice = parseFloat(p.markPrice ?? "0")
  const unrealisedPnl = parseFloat(p.unrealisedPnl ?? "0")
  const cost = averagePrice * quantity
  return {
    instrumentId: p.symbol,
    ticker: p.symbol,
    name: p.symbol,
    quantity,
    averagePrice,
    currentPrice,
    expectedYield: cost > 0 ? (unrealisedPnl / cost) * 100 : 0,
    expectedYieldAbsolute: unrealisedPnl,
    dailyYield: 0,
    currentValue: quantity * currentPrice,
    instrumentType: "CRYPTO",
    blocked: false,
    blockedLots: 0,
    operations: [],
  }
}

export class BybitProvider implements BrokerProvider {
  private client: RestClientV5 | null = null

  async connect(token: string): Promise<void> {
    const colonIndex = token.indexOf(":")
    if (colonIndex === -1) throw new Error("Invalid Bybit token format — expected 'apiKey:apiSecret'")
    const [key, secret] = [token.slice(0, colonIndex), token.slice(colonIndex + 1)]
    this.client = new RestClientV5({ key, secret, testnet: process.env.BYBIT_TESTNET !== "false" })
  }

  async disconnect(): Promise<void> {
    this.client = null
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    this.ensureClient()
    return [{ id: "bybit-unified", name: "Bybit Unified", type: "BYBIT", openedDate: "" }]
  }

  async getPortfolio(_accountId: string): Promise<Portfolio> {
    const client = this.ensureClient()
    const [walletRes, positionsRes] = await Promise.all([
      client.getWalletBalance({ accountType: "UNIFIED" }),
      client.getPositionInfo({ category: "linear", settleCoin: "USDT" }),
    ])
    const account = walletRes.result.list[0]
    const totalAmount = parseFloat(account.totalEquity ?? "0")
    const totalPerpUPL = parseFloat(account.totalPerpUPL ?? "0")
    const totalAvailableBalance = parseFloat(account.totalAvailableBalance ?? "0")
    return {
      totalAmount,
      expectedYield: totalAmount > 0 ? (totalPerpUPL / (totalAmount - totalPerpUPL)) * 100 : 0,
      expectedYieldAbsolute: totalPerpUPL,
      dailyYield: 0,
      dailyYieldRelative: 0,
      totalShares: 0,
      totalBonds: 0,
      totalEtf: 0,
      totalCurrencies: totalAmount,
      availableCash: totalAvailableBalance,
      positions: positionsRes.result.list.map(mapPosition),
    }
  }

  async getCandles(params: CandleParams): Promise<Candle[]> {
    const client = this.ensureClient()
    const interval = (BYBIT_INTERVAL_MAP[params.interval] ?? "D") as KlineIntervalV3
    const res = await client.getKline({
      category: "linear",
      symbol: params.instrumentId,
      interval,
      start: params.from.getTime(),
      end: params.to.getTime(),
      limit: 1000,
    })
    return res.result.list.reverse().map((row) => ({
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5]),
      time: new Date(parseInt(row[0])),
    }))
  }

  async getCurrentPrice(instrumentId: string): Promise<number> {
    const client = this.ensureClient()
    const res = await client.getTickers({ category: "linear", symbol: instrumentId })
    return parseFloat(res.result.list[0].lastPrice)
  }

  async getAvailableCash(_accountId: string): Promise<number> {
    const client = this.ensureClient()
    const res = await client.getWalletBalance({ accountType: "UNIFIED" })
    return parseFloat(res.result.list[0].totalAvailableBalance ?? "0")
  }

  async placeOrder(params: PlaceOrderParams): Promise<string> {
    const client = this.ensureClient()
    const res = await client.submitOrder({
      category: "linear",
      symbol: params.symbol,
      side: params.side === "BUY" ? "Buy" : "Sell",
      orderType: params.orderType === "LIMIT" ? "Limit" : "Market",
      qty: String(params.quantity),
      price: params.price ? String(params.price) : undefined,
      timeInForce: "GTC",
    })
    return res.result.orderId
  }

  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    const client = this.ensureClient()
    await client.cancelOrder({ category: "linear", symbol, orderId })
  }

  async getInstruments(type: string): Promise<BrokerInstrument[]> {
    if (type.toUpperCase() !== "CRYPTO") return []
    return BYBIT_CRYPTO_PAIRS.map((p) => ({
      figi: p.symbol,
      ticker: p.symbol,
      name: p.name,
      type: "CRYPTO" as const,
      currency: "USDT",
      lot: 1,
    }))
  }

  private ensureClient(): RestClientV5 {
    if (!this.client) throw new Error("Bybit client not connected — call connect() first")
    return this.client
  }
}
