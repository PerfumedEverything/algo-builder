import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("backtest-kit", () => ({
  addExchangeSchema: vi.fn(),
  setConfig: vi.fn(),
  Backtest: vi.fn(),
  listenDoneBacktest: vi.fn(),
}))

vi.mock("@/server/providers/broker", () => ({
  getBrokerProvider: vi.fn(),
}))

import { addExchangeSchema, setConfig } from "backtest-kit"
import { BacktestService } from "@/server/services/backtest-service"
import type { BacktestResult } from "@/server/services/backtest-service"

describe("BacktestService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(BacktestService as unknown as { initialized: boolean }).initialized = false
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
})
