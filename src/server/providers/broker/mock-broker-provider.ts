import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  Portfolio,
} from "@/core/types"
import type { BrokerProvider } from "./types"

export class MockBrokerProvider implements BrokerProvider {
  private connected = false

  async connect(_token: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    this.ensureConnected()
    return [
      {
        id: "mock-account-1",
        name: "Брокерский счёт",
        type: "TINKOFF",
        openedDate: "2024-01-15",
      },
      {
        id: "mock-sandbox-1",
        name: "Песочница",
        type: "SANDBOX",
        openedDate: "2024-06-01",
      },
    ]
  }

  async getPortfolio(_accountId: string): Promise<Portfolio> {
    this.ensureConnected()
    return {
      totalAmount: 1_250_000,
      expectedYield: 3.52,
      expectedYieldAbsolute: 42_500,
      dailyYield: 1_230,
      dailyYieldRelative: 0.10,
      totalShares: 950_000,
      totalBonds: 0,
      totalEtf: 150_000,
      totalCurrencies: 0,
      availableCash: 150_000,
      positions: [
        {
          instrumentId: "BBG004730N88",
          ticker: "SBER",
          name: "Сбербанк",
          quantity: 100,
          averagePrice: 265.50,
          currentPrice: 278.30,
          expectedYield: 4.82,
          expectedYieldAbsolute: 1_280,
          dailyYield: 120,
          currentValue: 27_830,
          instrumentType: "STOCK",
          blocked: false,
          blockedLots: 0,
        },
        {
          instrumentId: "BBG004730RP0",
          ticker: "GAZP",
          name: "Газпром",
          quantity: 200,
          averagePrice: 155.20,
          currentPrice: 148.70,
          expectedYield: -4.19,
          expectedYieldAbsolute: -1_300,
          dailyYield: -350,
          currentValue: 29_740,
          instrumentType: "STOCK",
          blocked: false,
          blockedLots: 0,
        },
        {
          instrumentId: "BBG004731032",
          ticker: "LKOH",
          name: "Лукойл",
          quantity: 5,
          averagePrice: 7_100,
          currentPrice: 7_350,
          expectedYield: 3.52,
          expectedYieldAbsolute: 1_250,
          dailyYield: 450,
          currentValue: 36_750,
          instrumentType: "STOCK",
          blocked: false,
          blockedLots: 0,
        },
      ],
    }
  }

  async getAvailableCash(_accountId: string): Promise<number> {
    this.ensureConnected()
    return 150_000
  }

  async getInstruments(_type: string): Promise<BrokerInstrument[]> {
    this.ensureConnected()
    return [
      { figi: "BBG004730N88", ticker: "SBER", name: "Сбербанк", type: "STOCK", currency: "RUB", lot: 10 },
      { figi: "BBG004730RP0", ticker: "GAZP", name: "Газпром", type: "STOCK", currency: "RUB", lot: 10 },
      { figi: "BBG004731032", ticker: "LKOH", name: "Лукойл", type: "STOCK", currency: "RUB", lot: 1 },
      { figi: "BBG0047315Y7", ticker: "ROSN", name: "Роснефть", type: "STOCK", currency: "RUB", lot: 1 },
      { figi: "BBG004731489", ticker: "GMKN", name: "Норникель", type: "STOCK", currency: "RUB", lot: 1 },
    ]
  }

  async getCandles(_params: CandleParams): Promise<Candle[]> {
    this.ensureConnected()
    const candles: Candle[] = []
    const now = new Date()
    for (let i = 30; i >= 0; i--) {
      const base = 270 + Math.random() * 20
      candles.push({
        open: base,
        high: base + Math.random() * 5,
        low: base - Math.random() * 5,
        close: base + (Math.random() - 0.5) * 8,
        volume: Math.floor(Math.random() * 100000),
        time: new Date(now.getTime() - i * 86400000),
      })
    }
    return candles
  }

  async getCurrentPrice(_instrumentId: string): Promise<number> {
    this.ensureConnected()
    return 278.3 + (Math.random() - 0.5) * 5
  }

  private ensureConnected() {
    if (!this.connected) throw new Error("Broker not connected")
  }
}
