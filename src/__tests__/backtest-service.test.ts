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
import { BacktestService } from "@/server/services/backtest-service"
import type { BacktestResult, BacktestParams } from "@/server/services/backtest-service"

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
