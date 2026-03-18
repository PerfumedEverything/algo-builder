import { describe, it, expect } from "vitest"
import { createStrategySchema } from "@/core/schemas/strategy"
import { createSignalSchema } from "@/core/schemas/signal"

describe("createStrategySchema", () => {
  const validStrategy = {
    name: "RSI Reversal",
    instrument: "SBER",
    instrumentType: "STOCK",
    timeframe: "1d",
    config: {
      entry: [
        {
          indicator: "RSI",
          params: { period: 14 },
          condition: "LESS_THAN",
          value: 30,
        },
      ],
      exit: [
        {
          indicator: "RSI",
          params: { period: 14 },
          condition: "GREATER_THAN",
          value: 70,
        },
      ],
      entryLogic: "AND",
      exitLogic: "AND",
      risks: {
        stopLoss: 3,
        takeProfit: 6,
      },
    },
  }

  it("validates correct strategy", () => {
    const result = createStrategySchema.safeParse(validStrategy)
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = createStrategySchema.safeParse({ ...validStrategy, name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid indicator", () => {
    const bad = {
      ...validStrategy,
      config: {
        ...validStrategy.config,
        entry: [{ ...validStrategy.config.entry[0], indicator: "INVALID" }],
      },
    }
    const result = createStrategySchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it("rejects invalid condition type", () => {
    const bad = {
      ...validStrategy,
      config: {
        ...validStrategy.config,
        entry: [{ ...validStrategy.config.entry[0], condition: "NOT_A_CONDITION" }],
      },
    }
    const result = createStrategySchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it("accepts strategy without description", () => {
    const result = createStrategySchema.safeParse(validStrategy)
    expect(result.success).toBe(true)
  })

  it("accepts all instrument types", () => {
    for (const type of ["STOCK", "BOND", "CURRENCY", "FUTURES"]) {
      const result = createStrategySchema.safeParse({ ...validStrategy, instrumentType: type })
      expect(result.success).toBe(true)
    }
  })

  it("accepts all indicator types", () => {
    for (const indicator of ["SMA", "EMA", "RSI", "MACD", "BOLLINGER", "PRICE", "VOLUME", "PRICE_CHANGE", "SUPPORT", "RESISTANCE"]) {
      const data = {
        ...validStrategy,
        config: {
          ...validStrategy.config,
          entry: [{ ...validStrategy.config.entry[0], indicator }],
        },
      }
      const result = createStrategySchema.safeParse(data)
      expect(result.success).toBe(true)
    }
  })

  it("accepts multiple entry conditions", () => {
    const data = {
      ...validStrategy,
      config: {
        ...validStrategy.config,
        entry: [
          { indicator: "RSI", params: { period: 14 }, condition: "LESS_THAN", value: 30 },
          { indicator: "PRICE", params: {}, condition: "GREATER_THAN", value: 200 },
        ],
      },
    }
    const result = createStrategySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("rejects empty entry conditions", () => {
    const data = {
      ...validStrategy,
      config: { ...validStrategy.config, entry: [] },
    }
    const result = createStrategySchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe("createSignalSchema", () => {
  const validSignal = {
    name: "SBER Buy Signal",
    instrument: "SBER",
    instrumentType: "STOCK",
    timeframe: "1h",
    signalType: "BUY",
    conditions: [
      {
        indicator: "RSI",
        params: { period: 14 },
        condition: "LESS_THAN",
        value: 30,
      },
    ],
    channels: ["telegram"],
  }

  it("validates correct signal", () => {
    const result = createSignalSchema.safeParse(validSignal)
    expect(result.success).toBe(true)
  })

  it("rejects empty conditions", () => {
    const result = createSignalSchema.safeParse({ ...validSignal, conditions: [] })
    expect(result.success).toBe(false)
  })

  it("rejects empty channels", () => {
    const result = createSignalSchema.safeParse({ ...validSignal, channels: [] })
    expect(result.success).toBe(false)
  })

  it("accepts telegram channel", () => {
    const result = createSignalSchema.safeParse({ ...validSignal, channels: ["telegram"] })
    expect(result.success).toBe(true)
  })

  it("rejects invalid channel", () => {
    const result = createSignalSchema.safeParse({ ...validSignal, channels: ["whatsapp"] })
    expect(result.success).toBe(false)
  })

  it("accepts BUY and SELL signal types", () => {
    expect(createSignalSchema.safeParse({ ...validSignal, signalType: "BUY" }).success).toBe(true)
    expect(createSignalSchema.safeParse({ ...validSignal, signalType: "SELL" }).success).toBe(true)
  })

  it("rejects invalid signal type", () => {
    expect(createSignalSchema.safeParse({ ...validSignal, signalType: "HOLD" }).success).toBe(false)
  })

  it("supports multiple conditions", () => {
    const multi = {
      ...validSignal,
      conditions: [
        { indicator: "RSI", params: { period: 14 }, condition: "LESS_THAN", value: 30 },
        { indicator: "PRICE", params: {}, condition: "GREATER_THAN", value: 200 },
      ],
    }
    expect(createSignalSchema.safeParse(multi).success).toBe(true)
  })

  it("accepts logicOperator", () => {
    const result = createSignalSchema.safeParse({ ...validSignal, logicOperator: "OR" })
    expect(result.success).toBe(true)
  })

  it("defaults logicOperator to AND", () => {
    const result = createSignalSchema.safeParse(validSignal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.logicOperator).toBe("AND")
    }
  })
})
