import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetStrategies = vi.fn()
const mockGetStats = vi.fn()
const mockCreateStrategy = vi.fn()
const mockUpdateStrategy = vi.fn()
const mockDeleteStrategy = vi.fn()
const mockActivateStrategy = vi.fn()
const mockDeactivateStrategy = vi.fn()
const mockGenerateWithAI = vi.fn()
const mockChatWithAI = vi.fn()

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/server/actions/helpers", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/server/services", () => ({
  StrategyService: vi.fn(function () {
    return {
      getStrategies: mockGetStrategies,
      getStats: mockGetStats,
      createStrategy: mockCreateStrategy,
      updateStrategy: mockUpdateStrategy,
      deleteStrategy: mockDeleteStrategy,
      activateStrategy: mockActivateStrategy,
      deactivateStrategy: mockDeactivateStrategy,
      generateWithAI: mockGenerateWithAI,
      chatWithAI: mockChatWithAI,
    }
  }),
}))
vi.mock("@/server/providers/ai", () => ({
  getAiProvider: vi.fn().mockReturnValue({}),
}))
vi.mock("@/server/services/strategy-checker", () => ({
  StrategyChecker: vi.fn(function () {
    return { checkAll: vi.fn().mockResolvedValue(undefined) }
  }),
}))
vi.mock("@/core/schemas", () => ({
  createStrategySchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  updateStrategySchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
}))
vi.mock("@/lib/ticker-utils", () => ({
  cleanTicker: vi.fn((t: string) => t),
}))
vi.mock("@/server/repositories/broker-repository", () => ({
  BrokerRepository: vi.fn(function () {
    return { getBrokerType: vi.fn().mockResolvedValue("TINKOFF") }
  }),
}))

import {
  getStrategiesAction,
  getStrategyStatsAction,
  createStrategyAction,
  updateStrategyAction,
  deleteStrategyAction,
  activateStrategyAction,
  deactivateStrategyAction,
  generateStrategyAction,
  chatStrategyAction,
} from "@/server/actions/strategy-actions"
import { getCurrentUserId } from "@/server/actions/helpers"
import { createStrategySchema } from "@/core/schemas"

const mockStrategies = [{ id: "s1", name: "Test" }]
const mockStrategy = { id: "s1" }
const validData = {
  name: "Test Strategy",
  instrument: "SBER",
  timeframe: "1h",
  config: { type: "INDICATOR" as const },
}

describe("strategy-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStrategies.mockResolvedValue(mockStrategies)
    mockGetStats.mockResolvedValue({ total: 2, active: 1, draft: 1, paused: 0 })
    mockCreateStrategy.mockResolvedValue(mockStrategy)
    mockUpdateStrategy.mockResolvedValue(mockStrategy)
    mockDeleteStrategy.mockResolvedValue(undefined)
    mockActivateStrategy.mockResolvedValue(mockStrategy)
    mockDeactivateStrategy.mockResolvedValue(mockStrategy)
    mockGenerateWithAI.mockResolvedValue({ name: "Generated", config: {} })
    mockChatWithAI.mockResolvedValue({ message: "response", strategy: null })
    vi.mocked(createStrategySchema.safeParse).mockReturnValue({
      success: true,
      data: {} as never,
    })
  })

  describe("getStrategiesAction", () => {
    it("calls getCurrentUserId and returns strategies", async () => {
      const res = await getStrategiesAction()
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toEqual(mockStrategies)
    })

    it("passes filters to service", async () => {
      await getStrategiesAction({ status: "ACTIVE" })
      expect(mockGetStrategies).toHaveBeenCalledWith("user-1", { status: "ACTIVE" })
    })
  })

  describe("getStrategyStatsAction", () => {
    it("calls getCurrentUserId and returns stats", async () => {
      const res = await getStrategyStatsAction()
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.total).toBe(2)
        expect(res.data.active).toBe(1)
      }
    })
  })

  describe("createStrategyAction", () => {
    it("validates via createStrategySchema and calls createStrategy", async () => {
      const res = await createStrategyAction(validData as never)
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.id).toBe("s1")
    })

    it("returns errorResponse on schema validation failure", async () => {
      vi.mocked(createStrategySchema.safeParse).mockReturnValue({
        success: false,
        error: { issues: [{ message: "Name is required" }] } as never,
      } as never)
      const res = await createStrategyAction({} as never)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toBe("Name is required")
    })
  })

  describe("updateStrategyAction", () => {
    it("validates via updateStrategySchema and calls updateStrategy", async () => {
      const res = await updateStrategyAction("s1", { name: "Updated" })
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.id).toBe("s1")
    })
  })

  describe("deleteStrategyAction", () => {
    it("calls deleteStrategy with id and userId", async () => {
      const res = await deleteStrategyAction("s1")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockDeleteStrategy).toHaveBeenCalledWith("s1", "user-1")
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.id).toBe("s1")
    })
  })

  describe("activateStrategyAction", () => {
    it("calls activateStrategy and returns id", async () => {
      const res = await activateStrategyAction("s1")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockActivateStrategy).toHaveBeenCalledWith("s1", "user-1")
      expect(res.success).toBe(true)
    })
  })

  describe("deactivateStrategyAction", () => {
    it("calls deactivateStrategy and returns id", async () => {
      const res = await deactivateStrategyAction("s1")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockDeactivateStrategy).toHaveBeenCalledWith("s1", "user-1")
      expect(res.success).toBe(true)
    })
  })

  describe("generateStrategyAction", () => {
    it("returns errorResponse on empty prompt", async () => {
      const res = await generateStrategyAction("   ")
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain("required")
    })

    it("calls generateWithAI on valid prompt", async () => {
      const res = await generateStrategyAction("Generate a momentum strategy")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
    })
  })

  describe("chatStrategyAction", () => {
    it("returns errorResponse on empty messages array", async () => {
      const res = await chatStrategyAction([])
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain("required")
    })

    it("calls chatWithAI with messages on valid input", async () => {
      const messages = [{ role: "user" as const, content: "Hello" }]
      const res = await chatStrategyAction(messages)
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
    })
  })
})
