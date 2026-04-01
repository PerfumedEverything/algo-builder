import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AiChatMessage } from "@/server/providers/ai/types"

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock("openai", () => {
  function MockOpenAI(this: unknown) {
    return { chat: { completions: { create: mockCreate } } }
  }
  return { default: MockOpenAI }
})

import { DeepSeekProvider } from "@/server/providers/ai/deepseek-provider"

function makeProvider() {
  return new DeepSeekProvider("test-key", "https://api.deepseek.com")
}

describe("DeepSeekProvider — Grid chat integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Test 1: chatWithThinking with brokerType=BYBIT uses crypto-aware system prompt", async () => {
    async function* fakeStream() {
      yield { choices: [{ delta: { content: "Crypto advice" } }] }
    }
    mockCreate.mockResolvedValue(fakeStream())

    const provider = makeProvider()
    const messages: AiChatMessage[] = [{ role: "user", content: "Анализируй рынок" }]

    const chunks = []
    for await (const chunk of provider.chatWithThinking!(messages, false, "BYBIT")) {
      chunks.push(chunk)
    }

    expect(mockCreate).toHaveBeenCalled()
    const callArgs = mockCreate.mock.calls[0][0]
    const systemMsg = callArgs.messages?.[0]
    expect(systemMsg?.role).toBe("system")
    expect(systemMsg?.content).toContain("Bybit")
  })

  it("Test 2: chatWithThinking detects 'создай grid' keyword and passes both tools", async () => {
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            type: "function",
            function: {
              name: "create_grid_strategy",
              arguments: JSON.stringify({
                name: "Grid SBER",
                instrument: "sber",
                instrumentType: "STOCK",
                description: "Grid на Сбер",
                config: {
                  type: "GRID",
                  lowerPrice: 270,
                  upperPrice: 310,
                  gridLevels: 10,
                  amountPerOrder: 1000,
                  gridDistribution: "ARITHMETIC",
                  feeRate: 0.001,
                },
              }),
            },
          }],
        },
      }],
    })

    const provider = makeProvider()
    const messages: AiChatMessage[] = [{ role: "user", content: "создай grid для Сбера" }]
    const chunks = []
    for await (const chunk of provider.chatWithThinking!(messages, false)) {
      chunks.push(chunk)
    }

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.tools).toBeDefined()
    expect(callArgs.tools.length).toBeGreaterThanOrEqual(2)
    const toolNames = callArgs.tools.map((t: { function: { name: string } }) => t.function.name)
    expect(toolNames).toContain("create_grid_strategy")
    expect(toolNames).toContain("create_strategy")
  })

  it("Test 3: when AI returns create_grid_strategy tool call, yields {type: 'grid_strategy', content: JSON}", async () => {
    const gridPayload = {
      name: "Grid SBER",
      instrument: "sber",
      instrumentType: "STOCK",
      description: "Grid на Сбер",
      config: {
        type: "GRID",
        lowerPrice: 270,
        upperPrice: 310,
        gridLevels: 10,
        amountPerOrder: 1000,
        gridDistribution: "ARITHMETIC",
        feeRate: 0.001,
      },
    }

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            type: "function",
            function: {
              name: "create_grid_strategy",
              arguments: JSON.stringify(gridPayload),
            },
          }],
        },
      }],
    })

    const provider = makeProvider()
    const messages: AiChatMessage[] = [{ role: "user", content: "создай grid стратегию" }]
    const chunks = []
    for await (const chunk of provider.chatWithThinking!(messages, true)) {
      chunks.push(chunk)
    }

    const gridChunk = chunks.find((c) => c.type === "grid_strategy")
    expect(gridChunk).toBeDefined()
    const parsed = JSON.parse(gridChunk!.content)
    expect(parsed.config.type).toBe("GRID")
    expect(parsed.name).toBe("Grid SBER")
  })

  it("Test 4: when AI returns create_strategy tool call, still yields {type: 'strategy'} (backward compat)", async () => {
    const strategyPayload = {
      name: "RSI стратегия",
      instrument: "sber",
      instrumentType: "STOCK",
      timeframe: "1h",
      description: "RSI стратегия",
      config: {
        entry: { indicator: "RSI", params: { period: 14 }, condition: "LESS_THAN", value: 30 },
        exit: { indicator: "RSI", params: { period: 14 }, condition: "GREATER_THAN", value: 70 },
        risks: { stopLoss: 3, takeProfit: 6 },
      },
    }

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            type: "function",
            function: {
              name: "create_strategy",
              arguments: JSON.stringify(strategyPayload),
            },
          }],
        },
      }],
    })

    const provider = makeProvider()
    const messages: AiChatMessage[] = [{ role: "user", content: "создай RSI стратегию" }]
    const chunks = []
    for await (const chunk of provider.chatWithThinking!(messages, true)) {
      chunks.push(chunk)
    }

    const strategyChunk = chunks.find((c) => c.type === "strategy")
    expect(strategyChunk).toBeDefined()
    const parsed = JSON.parse(strategyChunk!.content)
    expect(parsed.name).toBe("RSI стратегия")
  })

  it("Test 5: needsToolCall returns true for grid-related creation keywords", async () => {
    const gridPayload = {
      name: "Grid",
      instrument: "sber",
      instrumentType: "STOCK",
      description: "Grid",
      config: {
        type: "GRID",
        lowerPrice: 270,
        upperPrice: 310,
        gridLevels: 10,
        amountPerOrder: 1000,
        gridDistribution: "ARITHMETIC",
        feeRate: 0.001,
      },
    }

    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: null,
          tool_calls: [{
            type: "function",
            function: {
              name: "create_grid_strategy",
              arguments: JSON.stringify(gridPayload),
            },
          }],
        },
      }],
    })

    const provider = makeProvider()

    const gridKeywordMessages: AiChatMessage[][] = [
      [{ role: "user", content: "запусти сетку для BTC" }],
      [{ role: "user", content: "создай grid стратегию" }],
      [{ role: "user", content: "создай грид на ETH" }],
    ]

    for (const msgs of gridKeywordMessages) {
      mockCreate.mockClear()
      const chunks = []
      for await (const chunk of provider.chatWithThinking!(msgs, false)) {
        chunks.push(chunk)
      }
      expect(mockCreate).toHaveBeenCalledTimes(1)
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.tools).toBeDefined()
      const toolNames = callArgs.tools.map((t: { function: { name: string } }) => t.function.name)
      expect(toolNames).toContain("create_grid_strategy")
    }
  })
})
