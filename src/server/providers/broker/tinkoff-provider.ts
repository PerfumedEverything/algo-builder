import { TinkoffInvestApi } from "tinkoff-invest-api"
import { CandleInterval, LastPriceType } from "tinkoff-invest-api/dist/generated/marketdata"
import { InstrumentStatus } from "tinkoff-invest-api/dist/generated/common"
import { OperationState, OperationType } from "tinkoff-invest-api/dist/generated/operations"
import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  Portfolio,
  PortfolioPosition,
  PositionOperation,
} from "@/core/types"
import { FifoCalculator } from "@/server/services/fifo-calculator"
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

const mapInstrumentType = (type: string): "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF" => {
  const map: Record<string, "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF"> = {
    share: "STOCK",
    bond: "BOND",
    currency: "CURRENCY",
    future: "FUTURES",
    etf: "ETF",
  }
  return map[type.toLowerCase()] ?? "STOCK"
}

export class TinkoffProvider implements BrokerProvider {
  private api: TinkoffInvestApi | null = null
  private isSandbox = false

  async connect(token: string): Promise<void> {
    this.api = new TinkoffInvestApi({ token })
    try {
      const { accounts } = await this.api.users.getAccounts({})
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

    const yearAgo = new Date()
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)

    const [res, cash, opsRes] = await Promise.all([
      this.isSandbox
        ? client.sandbox.getSandboxPortfolio({ accountId })
        : client.operations.getPortfolio({ accountId }),
      this.getAvailableCash(accountId),
      this.isSandbox
        ? Promise.resolve({ operations: [] })
        : client.operations.getOperations({
            accountId,
            from: yearAgo,
            to: new Date(),
            state: OperationState.OPERATION_STATE_EXECUTED,
          }),
    ])

    const BUY_TYPES = new Set([OperationType.OPERATION_TYPE_BUY, OperationType.OPERATION_TYPE_BUY_CARD, OperationType.OPERATION_TYPE_BUY_MARGIN])
    const SELL_TYPES = new Set([OperationType.OPERATION_TYPE_SELL, OperationType.OPERATION_TYPE_SELL_CARD, OperationType.OPERATION_TYPE_SELL_MARGIN])

    const opsByFigi = new Map<string, PositionOperation[]>()
    for (const op of opsRes.operations) {
      const isBuy = BUY_TYPES.has(op.operationType)
      const isSell = SELL_TYPES.has(op.operationType)
      if (!isBuy && !isSell) continue
      if (!opsByFigi.has(op.figi)) opsByFigi.set(op.figi, [])
      opsByFigi.get(op.figi)!.push({
        id: op.id,
        type: isBuy ? "BUY" : "SELL",
        price: toNumber(op.price),
        quantity: op.quantity,
        amount: Math.abs(toNumber(op.payment)),
        date: op.date?.toISOString() ?? new Date().toISOString(),
      })
    }

    const totalAmount = toNumber(res.totalAmountPortfolio)
    const expectedYieldAbs = toNumber(res.expectedYield)
    const expectedYieldPct = totalAmount > 0
      ? (expectedYieldAbs / (totalAmount - expectedYieldAbs)) * 100
      : 0

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

        const quantity = toNumber(p.quantity)
        const currentPrice = toNumber(p.currentPrice)
        const apiAvgPrice = toNumber(p.averagePositionPrice)
        const ops = opsByFigi.get(p.figi) ?? []
        const fifoSummary = FifoCalculator.calculateSummary(ops, currentPrice)
        const averagePrice = fifoSummary.totalQuantity > 0 ? fifoSummary.avgPrice : apiAvgPrice
        const cost = averagePrice * quantity
        const yieldAbs = (currentPrice - averagePrice) * quantity
        const yieldPct = cost > 0 ? (yieldAbs / cost) * 100 : 0

        return {
          instrumentId: p.figi,
          ticker,
          name,
          quantity,
          averagePrice,
          currentPrice,
          expectedYield: yieldPct,
          expectedYieldAbsolute: yieldAbs,
          dailyYield: toNumber((p as unknown as Record<string, unknown>).dailyYield as { units: number; nano: number } | undefined),
          currentValue: quantity * currentPrice,
          instrumentType: mapInstrumentType(p.instrumentType),
          blocked: (p as unknown as Record<string, unknown>).blocked === true,
          blockedLots: toNumber((p as unknown as Record<string, unknown>).blockedLots as { units: number; nano: number } | undefined),
          operations: ops.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          lots: fifoSummary.lots,
        }
      }),
    )

    return {
      totalAmount,
      expectedYield: expectedYieldPct,
      expectedYieldAbsolute: expectedYieldAbs,
      dailyYield: toNumber(res.dailyYield),
      dailyYieldRelative: toNumber(res.dailyYieldRelative),
      totalShares: toNumber(res.totalAmountShares),
      totalBonds: toNumber(res.totalAmountBonds),
      totalEtf: toNumber(res.totalAmountEtf),
      totalCurrencies: toNumber(res.totalAmountCurrencies),
      availableCash: cash,
      positions,
    }
  }

  async getAvailableCash(accountId: string): Promise<number> {
    const client = this.ensureConnected()
    if (this.isSandbox) {
      const res = await client.sandbox.getSandboxPortfolio({ accountId })
      const totalPortfolio = toNumber(res.totalAmountPortfolio)
      const totalPositions = res.positions.reduce(
        (sum, p) => sum + toNumber(p.currentPrice) * toNumber(p.quantity), 0,
      )
      return Math.max(totalPortfolio - totalPositions, 0)
    }
    const { money } = await client.operations.getPositions({ accountId })
    const rub = money.find((m) => m.currency === "rub")
    return rub ? toNumber(rub) : 0
  }

  async getInstruments(type: string): Promise<BrokerInstrument[]> {
    const client = this.ensureConnected()
    const status = InstrumentStatus.INSTRUMENT_STATUS_BASE

    const filterTradeable = (items: TradableInstrument[]) =>
      items.filter((i) => i.apiTradeAvailableFlag && i.buyAvailableFlag)

    const fetchMap: Record<string, () => Promise<BrokerInstrument[]>> = {
      STOCK: async () => {
        const [shares, etfs] = await Promise.all([
          client.instruments.shares({ instrumentStatus: status }),
          client.instruments.etfs({ instrumentStatus: status }),
        ])
        return [
          ...filterTradeable(shares.instruments).map(mapShare),
          ...filterTradeable(etfs.instruments).map(mapShare),
        ]
      },
      BOND: async () => {
        const { instruments } = await client.instruments.bonds({ instrumentStatus: status })
        return filterTradeable(instruments).map(mapShare)
      },
      CURRENCY: async () => {
        const { instruments } = await client.instruments.currencies({ instrumentStatus: status })
        return filterTradeable(instruments).map(mapShare)
      },
      FUTURES: async () => {
        const { instruments } = await client.instruments.futures({ instrumentStatus: status })
        return filterTradeable(instruments).map(mapShare)
      },
    }

    const fetcher = fetchMap[type.toUpperCase()]
    if (!fetcher) return []
    return fetcher()
  }

  async getCandles(params: CandleParams): Promise<Candle[]> {
    const client = this.ensureConnected()
    const interval = INTERVAL_MAP[params.interval] ?? CandleInterval.CANDLE_INTERVAL_DAY

    let resolvedId = params.instrumentId
    if (!resolvedId.includes("-") && resolvedId.length < 20) {
      resolvedId = await this.resolveTickerToUid(resolvedId)
    }

    const { candles } = await client.marketdata.getCandles({
      instrumentId: resolvedId,
      from: params.from,
      to: params.to,
      interval,
    })

    return candles
      .filter((c) => c.isComplete)
      .map((c) => ({
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
      lastPriceType: LastPriceType.LAST_PRICE_DEALER,
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

    const upperTicker = ticker.toUpperCase()
    const exact = instruments.filter((i) => i.ticker.toUpperCase() === upperTicker)

    const PREFERRED_CLASS_CODES = ["TQBR", "TQTF", "TQOB", "TQCB", "TQIF"]

    const match =
      exact.find((i) => PREFERRED_CLASS_CODES.includes(i.classCode) && i.apiTradeAvailableFlag) ??
      exact.find((i) => PREFERRED_CLASS_CODES.includes(i.classCode)) ??
      exact.find((i) => i.apiTradeAvailableFlag) ??
      exact[0] ??
      instruments[0]

    if (match) return match.uid

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

type TradableInstrument = {
  figi: string
  ticker: string
  name: string
  instrumentType?: string
  currency: string
  lot: number
  apiTradeAvailableFlag?: boolean
  buyAvailableFlag?: boolean
}

const mapShare = (i: TradableInstrument): BrokerInstrument => ({
  figi: i.figi,
  ticker: i.ticker,
  name: i.name,
  type: mapInstrumentType(i.instrumentType ?? "share"),
  currency: i.currency,
  lot: i.lot,
})
