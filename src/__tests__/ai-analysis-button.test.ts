import { describe, it, expect, vi, beforeEach } from "vitest"

import { AI_PROMPTS, type AiAnalysisBlock } from "@/core/config/ai-prompts"

const EXPECTED_BLOCKS: AiAnalysisBlock[] = [
  "lot",
  "chart",
  "risk",
  "fundamental",
  "optimization",
  "portfolio",
]

describe("AI_PROMPTS config", () => {
  it("has exactly 6 block types", () => {
    const keys = Object.keys(AI_PROMPTS)
    expect(keys).toHaveLength(6)
  })

  it("contains all expected block keys", () => {
    for (const block of EXPECTED_BLOCKS) {
      expect(AI_PROMPTS).toHaveProperty(block)
    }
  })

  it("each prompt is a non-empty string", () => {
    for (const block of EXPECTED_BLOCKS) {
      expect(typeof AI_PROMPTS[block]).toBe("string")
      expect(AI_PROMPTS[block].length).toBeGreaterThan(0)
    }
  })

  it("lot prompt contains FIFO keywords", () => {
    expect(AI_PROMPTS.lot).toContain("FIFO")
    expect(AI_PROMPTS.lot).toContain("бухгалтер")
  })

  it("chart prompt contains technical analysis keywords", () => {
    expect(AI_PROMPTS.chart).toContain("технический аналитик")
    expect(AI_PROMPTS.chart).toContain("OHLCV")
  })
})

vi.mock("@/core/config/env", () => ({
  getEnv: vi.fn(),
}))

vi.mock("@/server/actions/helpers", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("test-user-id"),
}))

const mockCreate = vi.fn()
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } }
    },
  }
})

describe("analyzeWithAiAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("returns error when API key is missing", async () => {
    const { getEnv } = await import("@/core/config/env")
    vi.mocked(getEnv).mockReturnValue({
      DEEPSEEK_API_KEY: undefined,
    } as ReturnType<typeof getEnv>)

    const { analyzeWithAiAction } = await import(
      "@/server/actions/ai-analysis-actions"
    )
    const result = await analyzeWithAiAction("chart", "test data")

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe("AI провайдер не настроен")
    }
  })

  it("uses correct system prompt for the given block", async () => {
    const { getEnv } = await import("@/core/config/env")
    vi.mocked(getEnv).mockReturnValue({
      DEEPSEEK_API_KEY: "test-key",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    } as ReturnType<typeof getEnv>)

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "AI response" } }],
    })

    const { analyzeWithAiAction } = await import(
      "@/server/actions/ai-analysis-actions"
    )
    const result = await analyzeWithAiAction("chart", "OHLCV data here")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe("AI response")
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-chat",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: AI_PROMPTS.chart,
          }),
          expect.objectContaining({
            role: "user",
            content: "OHLCV data here",
          }),
        ]),
      }),
    )
  })
})
