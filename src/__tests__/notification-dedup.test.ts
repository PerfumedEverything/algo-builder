import { describe, it, expect, vi, beforeEach } from "vitest"

const mockRepoInstance = {
  create: vi.fn(),
  findByStrategyId: vi.fn(),
  getStatsByStrategyId: vi.fn(),
}

vi.mock("@/lib/redis", () => ({
  redis: {
    set: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("@/server/providers/notification", () => ({
  TelegramProvider: vi.fn(() => ({
    send: vi.fn(),
  })),
}))

vi.mock("@/server/repositories/operation-repository", () => {
  return {
    OperationRepository: function () {
      return mockRepoInstance
    },
  }
})

vi.mock("@/server/repositories", () => {
  return {
    OperationRepository: function () {
      return mockRepoInstance
    },
  }
})

import { redis } from "@/lib/redis"
import { SignalTriggerHandler } from "@/server/services/signal-trigger-handler"
import { StrategyTriggerHandler } from "@/server/services/strategy-trigger-handler"
import {
  formatPriceLevel,
  formatPriceChange,
  formatVolumeAnomaly,
  formatLevelBreakout,
} from "@/server/services/notification-templates"
import { OperationService } from "@/server/services/operation-service"

const makeSignal = (overrides = {}) => ({
  id: "sig1",
  userId: "user1",
  instrument: "SBER",
  name: "Тест алерт",
  triggerCount: 0,
  repeatMode: false,
  channels: ["telegram"],
  conditions: [{ indicator: "PRICE", value: 300, condition: "GREATER_THAN", params: {} }],
  signalType: "ALERT",
  logicOperator: "AND",
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makeStrategy = (overrides = {}) => ({
  id: "strat1",
  userId: "user1",
  instrument: "SBER",
  name: "Тест стратегия",
  positionState: "NONE",
  config: {
    type: "INDICATOR",
    entry: [],
    exit: [],
    entryLogic: "AND",
    exitLogic: "AND",
    risks: { tradeAmount: 5000, stopLoss: 2, takeProfit: 4 },
  },
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makeCtx = () => ({
  price: 305,
  candles: [
    { open: 300, high: 310, low: 295, close: 305, volume: 10000, time: new Date() },
    { open: 298, high: 308, low: 293, close: 302, volume: 9000, time: new Date() },
    { open: 302, high: 312, low: 297, close: 308, volume: 11000, time: new Date() },
  ],
})

const makeDb = () => {
  const singleFn = vi.fn(() => Promise.resolve({ data: { telegramChatId: "123" } }))
  const eqForSelect = vi.fn(() => ({ single: singleFn }))
  const selectFn = vi.fn(() => ({ eq: eqForSelect }))
  const insertFn = vi.fn(() => Promise.resolve({ data: null, error: null }))
  const innerSelect = vi.fn(() => Promise.resolve({ data: [{ id: "s1" }] }))
  const innerEq2 = vi.fn(() => ({ select: innerSelect }))
  const innerEq1 = vi.fn(() => ({ eq: innerEq2 }))
  const updateFn = vi.fn(() => ({ eq: innerEq1 }))

  return {
    from: vi.fn(() => ({
      update: updateFn,
      insert: insertFn,
      select: selectFn,
    })),
  } as unknown as ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
}

describe("Notification deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Test 1: Redis SET NX acquired — signal handler calls redis.set with NX", async () => {
    vi.mocked(redis.set).mockResolvedValue("OK")
    const db = makeDb()
    const handler = new SignalTriggerHandler(db)
    const signal = makeSignal()
    await handler.handle(signal, { signalId: signal.id, triggered: true, message: "test" })
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining("notif:signal:sig1:"),
      "1",
      "EX",
      300,
      "NX",
    )
  })

  it("Test 1b: Redis SET NX returns null (already locked) — handler returns early without DB calls", async () => {
    vi.mocked(redis.set).mockResolvedValue(null)
    const db = makeDb()
    const handler = new SignalTriggerHandler(db)
    const signal = makeSignal()
    await handler.handle(signal, { signalId: signal.id, triggered: true, message: "test" })
    expect(db.from).not.toHaveBeenCalled()
  })
})

describe("Notification templates — signal name in all formats", () => {
  const signal = makeSignal({ name: "Мой алерт" })
  const ctx = makeCtx()

  it("Test 2: formatPriceLevel includes signal.name", () => {
    const result = formatPriceLevel("SBER", signal, ctx)
    expect(result).toContain("Мой алерт")
  })

  it("Test 3: formatPriceChange includes signal.name", () => {
    const result = formatPriceChange("SBER", signal, ctx)
    expect(result).toContain("Мой алерт")
  })

  it("Test 4: formatVolumeAnomaly includes signal.name", () => {
    const result = formatVolumeAnomaly("SBER", signal, ctx)
    expect(result).toContain("Мой алерт")
  })

  it("Test 5: formatLevelBreakout includes signal.name", () => {
    const signalResistance = makeSignal({
      name: "Мой алерт",
      conditions: [{ indicator: "RESISTANCE", value: 300, condition: "GREATER_THAN", params: { lookback: 3 } }],
    })
    const result = formatLevelBreakout("SBER", signalResistance, ctx, "RESISTANCE")
    expect(result).toContain("Мой алерт")
  })
})

describe("Strategy trigger handler — P&L and position duration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(redis.set).mockResolvedValue("OK")
    mockRepoInstance.findByStrategyId.mockResolvedValue([])
    mockRepoInstance.create.mockResolvedValue({
      id: "op1",
      strategyId: "strat1",
      userId: "user1",
      type: "SELL",
      instrument: "SBER",
      price: 320,
      quantity: 10,
      amount: 3200,
      createdAt: new Date().toISOString(),
    })
  })

  it("Test 6: exit notification includes P&L, entry/exit prices, and position duration", async () => {
    const buyOp = {
      id: "op0",
      strategyId: "strat1",
      userId: "user1",
      type: "BUY" as const,
      instrument: "SBER",
      price: 295,
      quantity: 10,
      amount: 2950,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    }
    mockRepoInstance.findByStrategyId.mockResolvedValue([buyOp])

    const db = makeDb()
    const handler = new StrategyTriggerHandler(db)
    const strategy = makeStrategy({ positionState: "OPEN" })
    const sendMock = vi.fn()
    handler["_telegram"] = { send: sendMock } as unknown as import("@/server/providers/notification").TelegramProvider

    await handler.handle(strategy, { side: "exit", triggered: true, price: 320, message: "Выход" })

    const sentMessage = sendMock.mock.calls[0]?.[1] ?? ""
    expect(sentMessage).toContain("P&L")
    expect(sentMessage).toContain("Вход")
    expect(sentMessage).toContain("Позиция")
  })

  it("Test 7: P&L NOT calculated when recordedQuantity=0 (no fallback to 1)", async () => {
    const buyOp = {
      id: "op0",
      strategyId: "strat1",
      userId: "user1",
      type: "BUY" as const,
      instrument: "SBER",
      price: 295,
      quantity: 0,
      amount: 0,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    }
    mockRepoInstance.findByStrategyId.mockResolvedValue([buyOp])
    mockRepoInstance.create.mockResolvedValue({
      id: "op1",
      strategyId: "strat1",
      userId: "user1",
      type: "SELL",
      instrument: "SBER",
      price: 320,
      quantity: 0,
      amount: 0,
      createdAt: new Date().toISOString(),
    })

    const db = makeDb()
    const handler = new StrategyTriggerHandler(db)
    const strategy = makeStrategy({ positionState: "OPEN" })
    const sendMock = vi.fn()
    handler["_telegram"] = { send: sendMock } as unknown as import("@/server/providers/notification").TelegramProvider

    await handler.handle(strategy, { side: "exit", triggered: true, price: 320, message: "Выход" })
    const sentMessage = sendMock.mock.calls[0]?.[1] ?? ""
    expect(sentMessage).not.toContain("P&L:")
  })
})

describe("OperationService — getLastBuyOperation", () => {
  it("Test 8: getLastBuyOperation returns full operation with createdAt", async () => {
    const fakeOp = {
      id: "op1",
      strategyId: "strat1",
      userId: "user1",
      type: "BUY" as const,
      instrument: "SBER",
      price: 295,
      quantity: 10,
      amount: 2950,
      createdAt: "2026-03-01T10:00:00Z",
    }
    mockRepoInstance.findByStrategyId.mockResolvedValue([fakeOp])

    const service = new OperationService()
    const result = await service.getLastBuyOperation("strat1")
    expect(result).not.toBeNull()
    expect(result?.price).toBe(295)
    expect(result?.createdAt).toBe("2026-03-01T10:00:00Z")
    expect(result?.quantity).toBe(10)
  })
})
