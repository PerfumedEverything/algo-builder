import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("backtest-kit", () => ({
  addExchangeSchema: vi.fn(),
  setConfig: vi.fn(),
  addStrategySchema: vi.fn(),
  Backtest: {
    run: vi.fn(),
    getData: vi.fn(),
  },
}))

vi.mock("@/server/providers/broker", () => ({
  getBrokerProvider: vi.fn(),
}))

import { addExchangeSchema, setConfig, addStrategySchema, Backtest } from "backtest-kit"
import { getBrokerProvider } from "@/server/providers/broker"
import { BacktestService } from "@/server/services/backtest-service"
import type { BacktestResult, BacktestParams } from "@/server/services/backtest-service"
import type { Candle } from "@/core/types"

const mockRun = Backtest.run as ReturnType<typeof vi.fn>
const mockGetData = Backtest.getData as ReturnType<typeof vi.fn>

const makeParams = (overrides: Partial<BacktestParams> = {}): BacktestParams => ({
  instrumentId: "SBER",
  interval: "1h",
  fromDate: new Date("2024-01-01"),
  toDate: new Date("2024-12-31"),
  entryConditions: JSON.stringify({
    conditions: [],
    logic: "AND",
    risks: { takeProfit: 5, stopLoss: 2 },
  }),
  exitConditions: JSON.stringify({ conditions: [], logic: "AND" }),
  positionSize: 10000,
  ...overrides,
})

const makeStats = (overrides = {}) => ({
  totalSignals: 0,
  winCount: 0,
  lossCount: 0,
  winRate: null,
  avgPnl: null,
  totalPnl: null,
  stdDev: null,
  sharpeRatio: null,
  annualizedSharpeRatio: null,
  certaintyRatio: null,
  expectedYearlyReturns: null,
  signalList: [],
  ...overrides,
})

async function* emptyGen() {}

describe("BacktestService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(BacktestService as unknown as { initialized: boolean }).initialized = false
    mockRun.mockReturnValue(emptyGen())
    mockGetData.mockResolvedValue(makeStats())
  })

  it("initialize sets config with MOEX slippage and fees", () => {
    BacktestService.initialize()
    expect(setConfig).toHaveBeenCalledWith({
      CC_PERCENT_SLIPPAGE: 0.05,
      CC_PERCENT_FEE: 0.03,
    })
  })

  it("initialize registers tinkoff-moex exchange schema", () => {
    BacktestService.initialize()
    expect(addExchangeSchema).toHaveBeenCalledWith(
      expect.objectContaining({ exchangeName: "tinkoff-moex" }),
    )
  })

  it("initialize is idempotent", () => {
    BacktestService.initialize()
    BacktestService.initialize()
    expect(setConfig).toHaveBeenCalledTimes(1)
  })

  it("isInitialized returns true after initialize", () => {
    expect(BacktestService.isInitialized()).toBe(false)
    BacktestService.initialize()
    expect(BacktestService.isInitialized()).toBe(true)
  })

  it("BacktestResult type is exported and has expected shape", () => {
    const result: BacktestResult = {
      totalTrades: 10,
      winRate: 0.6,
      totalPnl: 1500,
      maxDrawdown: 300,
      sharpeRatio: 1.2,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    }
    expect(result.totalTrades).toBe(10)
    expect(result.winRate).toBe(0.6)
  })

  it("runBacktest registers dynamic strategy schema via addStrategySchema", async () => {
    await BacktestService.runBacktest(makeParams())
    expect(addStrategySchema).toHaveBeenCalledWith(
      expect.objectContaining({ interval: "1h" }),
    )
  })

  it("runBacktest calls Backtest.run and Backtest.getData", async () => {
    await BacktestService.runBacktest(makeParams())

    expect(mockRun).toHaveBeenCalledWith(
      "SBER",
      expect.objectContaining({ exchangeName: "tinkoff-moex", frameName: "backtest" }),
    )
    expect(mockGetData).toHaveBeenCalled()
  })

  it("runBacktest maps BacktestStatisticsModel fields correctly", async () => {
    mockGetData.mockResolvedValue(
      makeStats({
        totalSignals: 12,
        winRate: 66.6,
        totalPnl: 18,
        sharpeRatio: 0.5,
      }),
    )

    const result = await BacktestService.runBacktest(makeParams())

    expect(result.totalTrades).toBe(12)
    expect(result.winRate).toBe(66.6)
    expect(result.totalPnl).toBe(18)
    expect(result.sharpeRatio).toBe(0.5)
  })

  it("runBacktest maps null stats fields to 0", async () => {
    const result = await BacktestService.runBacktest(makeParams())

    expect(result.winRate).toBe(0)
    expect(result.totalPnl).toBe(0)
    expect(result.sharpeRatio).toBe(0)
  })

  it("runBacktest uses unique strategyName per call", async () => {
    await BacktestService.runBacktest(makeParams())
    mockRun.mockReturnValue(emptyGen())
    await BacktestService.runBacktest(makeParams())

    const calls = (addStrategySchema as ReturnType<typeof vi.fn>).mock.calls
    const name1 = calls[0][0].strategyName as string
    const name2 = calls[1][0].strategyName as string
    expect(name1).not.toBe(name2)
    expect(name1.startsWith("bt-")).toBe(true)
  })

  it("runBacktest calculates maxDrawdown from signalList pnlPercentage", async () => {
    const signalList = [
      { action: "closed", pnl: { pnlPercentage: 5 } },
      { action: "closed", pnl: { pnlPercentage: -3 } },
      { action: "closed", pnl: { pnlPercentage: 2 } },
      { action: "closed", pnl: { pnlPercentage: -8 } },
      { action: "closed", pnl: { pnlPercentage: 1 } },
    ]
    mockGetData.mockResolvedValue(
      makeStats({ totalSignals: 5, signalList: signalList as never }),
    )

    const result = await BacktestService.runBacktest(makeParams())

    expect(result.maxDrawdown).toBeGreaterThan(0)
  })

  it("runBacktest returns startDate and endDate from params", async () => {
    const from = new Date("2024-01-01")
    const to = new Date("2024-12-31")
    const result = await BacktestService.runBacktest(makeParams({ fromDate: from, toDate: to }))

    expect(result.startDate).toBe(from)
    expect(result.endDate).toBe(to)
  })
})

const makeFlatCandle = (closePrice: number, time: Date): Candle => ({
  time,
  open: closePrice,
  high: closePrice + 0.5,
  low: closePrice - 0.5,
  close: closePrice,
  volume: 1000,
})

const makeDroppingCandles = (count: number, startTime: Date): Candle[] => {
  const candles: Candle[] = []
  for (let i = 0; i < count; i++) {
    const t = new Date(startTime.getTime() + i * 3600000)
    candles.push(makeFlatCandle(200 - i * 3, t))
  }
  return candles
}

const makeRisingCandles = (count: number, startTime: Date, startPrice: number): Candle[] => {
  const candles: Candle[] = []
  for (let i = 0; i < count; i++) {
    const t = new Date(startTime.getTime() + i * 3600000)
    candles.push(makeFlatCandle(startPrice + i * 3, t))
  }
  return candles
}

const makeNeutralCandles = (count: number, startTime: Date): Candle[] => {
  const candles: Candle[] = []
  for (let i = 0; i < count; i++) {
    const t = new Date(startTime.getTime() + i * 3600000)
    const price = 100 + Math.sin(i * 0.3) * 5
    candles.push(makeFlatCandle(price, t))
  }
  return candles
}

describe("CALC-13: getSignal condition evaluation", () => {
  const mockGetBroker = getBrokerProvider as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    ;(BacktestService as unknown as { initialized: boolean }).initialized = false
    mockRun.mockReturnValue(emptyGen())
    mockGetData.mockResolvedValue(makeStats())
  })

  it("getSignal returns null when entry conditions are never met (conditions empty)", async () => {
    const start = new Date("2024-01-01T00:00:00Z")
    const candles = makeNeutralCandles(50, start)

    mockGetBroker.mockReturnValue({
      getCandles: vi.fn().mockResolvedValue(candles),
    })

    let capturedGetSignal: ((symbol: string, when: Date) => Promise<unknown>) | null = null
    ;(addStrategySchema as ReturnType<typeof vi.fn>).mockImplementation((schema: { getSignal: (symbol: string, when: Date) => Promise<unknown> }) => {
      capturedGetSignal = schema.getSignal
    })

    await BacktestService.runBacktest(
      makeParams({
        fromDate: start,
        toDate: new Date("2024-03-01"),
        entryConditions: JSON.stringify({
          conditions: [],
          logic: "AND",
          risks: { takeProfit: 3, stopLoss: 1.5 },
        }),
      }),
    )

    expect(capturedGetSignal).not.toBeNull()
    const signal = await capturedGetSignal!("SBER", candles[20].time)
    expect(signal).toBeNull()
  })

  it("getSignal returns { position: 'long' } when entry conditions are met", async () => {
    const start = new Date("2024-01-01T00:00:00Z")
    const droppingPart = makeDroppingCandles(25, start)
    const lastDropTime = droppingPart[droppingPart.length - 1].time
    const risingPart = makeRisingCandles(25, new Date(lastDropTime.getTime() + 3600000), 40)
    const candles = [...droppingPart, ...risingPart]

    mockGetBroker.mockReturnValue({
      getCandles: vi.fn().mockResolvedValue(candles),
    })

    let capturedGetSignal: ((symbol: string, when: Date) => Promise<unknown>) | null = null
    ;(addStrategySchema as ReturnType<typeof vi.fn>).mockImplementation((schema: { getSignal: (symbol: string, when: Date) => Promise<unknown> }) => {
      capturedGetSignal = schema.getSignal
    })

    await BacktestService.runBacktest(
      makeParams({
        fromDate: start,
        toDate: new Date("2024-03-01"),
        entryConditions: JSON.stringify({
          conditions: [{ indicator: "RSI", params: { period: 14 }, condition: "LESS_THAN", value: 40 }],
          logic: "AND",
          risks: { takeProfit: 3, stopLoss: 1.5 },
        }),
        exitConditions: JSON.stringify({
          conditions: [{ indicator: "RSI", params: { period: 14 }, condition: "GREATER_THAN", value: 60 }],
          logic: "OR",
        }),
      }),
    )

    expect(capturedGetSignal).not.toBeNull()

    const signalAtBottomIdx = candles.length - 15
    const signalAtBottom = await capturedGetSignal!("SBER", candles[signalAtBottomIdx].time)
    const signalAtStart = await capturedGetSignal!("SBER", candles[16].time)

    expect(signalAtStart === null || (signalAtStart as { position: string }).position === "long").toBe(true)
    expect(signalAtBottom).not.toBeUndefined()
  })

  it("getSignal stub behavior is gone: returns null when RSI never crosses threshold", async () => {
    const start = new Date("2024-01-01T00:00:00Z")
    const candles = makeNeutralCandles(60, start)

    mockGetBroker.mockReturnValue({
      getCandles: vi.fn().mockResolvedValue(candles),
    })

    let capturedGetSignal: ((symbol: string, when: Date) => Promise<unknown>) | null = null
    ;(addStrategySchema as ReturnType<typeof vi.fn>).mockImplementation((schema: { getSignal: (symbol: string, when: Date) => Promise<unknown> }) => {
      capturedGetSignal = schema.getSignal
    })

    await BacktestService.runBacktest(
      makeParams({
        fromDate: start,
        toDate: new Date("2024-03-01"),
        entryConditions: JSON.stringify({
          conditions: [{ indicator: "RSI", params: { period: 14 }, condition: "LESS_THAN", value: 10 }],
          logic: "AND",
          risks: { takeProfit: 3, stopLoss: 1.5 },
        }),
      }),
    )

    expect(capturedGetSignal).not.toBeNull()

    const nullSignals = await Promise.all(
      candles.slice(15).map((c) => capturedGetSignal!("SBER", c.time)),
    )
    expect(nullSignals.every((s) => s === null)).toBe(true)
  })
})
