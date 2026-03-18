import { TinkoffInvestApi } from "tinkoff-invest-api"
import { CandleInterval, LastPriceType } from "tinkoff-invest-api/dist/generated/marketdata"
import { InstrumentStatus } from "tinkoff-invest-api/dist/generated/common"
import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  Portfolio,
  PortfolioPosition,
} from "@/core/types"
import type { BrokerProvider } from "./types"

const INTERVAL_MAP: Record<string, CandleInterval> = {
  "1m": CandleInterval.CANDLE_INTERVAL_1_MIN,
  "5m": CandleInterval.CANDLE_INTERVAL_5_MIN,
  "15m": CandleInterval.CANDLE_INTERVAL_15_MIN,
  "1h": CandleInterval.CANDLE_INTERVAL_HOUR,
  "1d": CandleInterval.CANDLE_INTERVAL_DAY,
  "1w": CandleInterval.CANDLE_INTERVAL_WEEK,
  "1M": CandleInterval.CANDLE_INTERVAL_MONTH,
}

const toNumber = (q?: { units: number; nano: number }): number => {
  if (!q) return 0
  return q.units + q.nano / 1_000_000_000
}

const mapInstrumentType = (type: string): "STOCK" | "BOND" | "CURRENCY" | "FUTURES" => {
  const map: Record<string, "STOCK" | "BOND" | "CURRENCY" | "FUTURES"> = {
    share: "STOCK",
    bond: "BOND",
    currency: "CURRENCY",
    future: "FUTURES",
    etf: "STOCK",
  }
  return map[type.toLowerCase()] ?? "STOCK"
}

export class TinkoffProvider implements BrokerProvider {
  private api: TinkoffInvestApi | null = null
  private isSandbox = false

  async connect(token: string): Promise<void> {
    this.api = new TinkoffInvestApi({ token })
    try {
      await this.api.users.getAccounts({})
      this.isSandbox = false
    } catch (e: unknown) {
      const code = (e as { code?: number }).code
      if (code === 16 || code === 7) {
        await this.api.sandbox.getSandboxAccounts({})
        this.isSandbox = true
      } else {
        throw e
      }
    }
  }

  async disconnect(): Promise<void> {
    this.api = null
    this.isSandbox = false
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    const client = this.ensureConnected()

    if (this.isSandbox) {
      const { accounts } = await client.sandbox.getSandboxAccounts({})
      if (accounts.length === 0) {
        const { accountId } = await client.sandbox.openSandboxAccount({})
        return [{
          id: accountId,
          name: "Песочница",
          type: "SANDBOX",
          openedDate: new Date().toISOString().split("T")[0],
        }]
      }
      return accounts.map((a) => ({
        id: a.id,
        name: a.name || `Песочница ${a.id.slice(-4)}`,
        type: "SANDBOX" as const,
        openedDate: a.openedDate?.toISOString().split("T")[0] ?? "",
      }))
    }

    const { accounts } = await client.users.getAccounts({})
    return accounts.map((a) => ({
      id: a.id,
      name: a.name || `Счёт ${a.id.slice(-4)}`,
      type: "TINKOFF" as const,
      openedDate: a.openedDate?.toISOString().split("T")[0] ?? "",
    }))
  }

  async getPortfolio(accountId: string): Promise<Portfolio> {
    const client = this.ensureConnected()

    const res = this.isSandbox
      ? await client.sandbox.getSandboxPortfolio({ accountId })
      : await client.operations.getPortfolio({ accountId })

    const positions: PortfolioPosition[] = await Promise.all(
      res.positions.map(async (p) => {
        let ticker = p.figi
        let name = p.figi
        try {
          const info = await client.instruments.getInstrumentBy({
            idType: 1,
            id: p.figi,
          })
          ticker = info.instrument?.ticker ?? p.figi
          name = info.instrument?.name ?? p.figi
        } catch {
        }

        return {
          instrumentId: p.figi,
          ticker,
          name,
          quantity: toNumber(p.quantity),
          averagePrice: toNumber(p.averagePositionPrice),
          currentPrice: toNumber(p.currentPrice),
          expectedYield: toNumber(p.expectedYield),
          instrumentType: mapInstrumentType(p.instrumentType),
        }
      }),
    )

    return {
      totalAmount: toNumber(res.totalAmountPortfolio),
      expectedYield: toNumber(res.expectedYield),
      positions,
    }
  }

  async getInstruments(type: string): Promise<BrokerInstrument[]> {
    const client = this.ensureConnected()
    const status = InstrumentStatus.INSTRUMENT_STATUS_BASE

    const fetchMap: Record<string, () => Promise<BrokerInstrument[]>> = {
      STOCK: async () => {
        const { instruments } = await client.instruments.shares({ instrumentStatus: status })
        return instruments.map(mapShare)
      },
      BOND: async () => {
        const { instruments } = await client.instruments.bonds({ instrumentStatus: status })
        return instruments.map(mapShare)
      },
      CURRENCY: async () => {
        const { instruments } = await client.instruments.currencies({ instrumentStatus: status })
        return instruments.map(mapShare)
      },
      FUTURES: async () => {
        const { instruments } = await client.instruments.futures({ instrumentStatus: status })
        return instruments.map(mapShare)
      },
    }

    const fetcher = fetchMap[type.toUpperCase()]
    if (!fetcher) return []
    return fetcher()
  }

  async getCandles(params: CandleParams): Promise<Candle[]> {
    const client = this.ensureConnected()
    const interval = INTERVAL_MAP[params.interval] ?? CandleInterval.CANDLE_INTERVAL_DAY

    const { candles } = await client.marketdata.getCandles({
      instrumentId: params.instrumentId,
      from: params.from,
      to: params.to,
      interval,
    })

    return candles.map((c) => ({
      open: toNumber(c.open),
      high: toNumber(c.high),
      low: toNumber(c.low),
      close: toNumber(c.close),
      volume: Number(c.volume),
      time: c.time ?? new Date(),
    }))
  }

  async getCurrentPrice(instrumentId: string): Promise<number> {
    const client = this.ensureConnected()

    let resolvedId = instrumentId
    if (!instrumentId.includes("-") && instrumentId.length < 20) {
      resolvedId = await this.resolveTickerToUid(instrumentId)
    }

    const { lastPrices } = await client.marketdata.getLastPrices({
      figi: [],
      instrumentId: [resolvedId],
      lastPriceType: LastPriceType.LAST_PRICE_EXCHANGE,
    })

    if (!lastPrices.length || !lastPrices[0].price) {
      throw new Error(`Цена не найдена для ${instrumentId}`)
    }

    return toNumber(lastPrices[0].price)
  }

  private async resolveTickerToUid(ticker: string): Promise<string> {
    const client = this.ensureConnected()
    const { instruments } = await client.instruments.findInstrument({
      query: ticker.toUpperCase(),
    })

    const match = instruments.find(
      (i) => i.ticker.toUpperCase() === ticker.toUpperCase() && i.instrumentKind === 1,
    )

    if (match) return match.uid

    if (instruments.length > 0) return instruments[0].uid

    throw new Error(`Инструмент "${ticker}" не найден`)
  }

  async sandboxPayIn(accountId: string, amount: number): Promise<void> {
    const client = this.ensureConnected()
    if (!this.isSandbox) throw new Error("Пополнение доступно только для sandbox-счёта")
    await client.sandbox.sandboxPayIn({
      accountId,
      amount: { units: Math.floor(amount), nano: 0, currency: "rub" },
    })
  }

  private ensureConnected(): TinkoffInvestApi {
    if (!this.api) throw new Error("Брокер не подключён")
    return this.api
  }
}

const mapShare = (i: {
  figi: string
  ticker: string
  name: string
  instrumentType?: string
  currency: string
  lot: number
}): BrokerInstrument => ({
  figi: i.figi,
  ticker: i.ticker,
  name: i.name,
  type: mapInstrumentType(i.instrumentType ?? "share"),
  currency: i.currency,
  lot: i.lot,
})
