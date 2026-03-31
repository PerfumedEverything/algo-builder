import { describe, it, expect, vi, beforeEach } from "vitest"

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockGetConnectionStatus = vi.fn()
const mockGetAccounts = vi.fn()
const mockSelectAccount = vi.fn()
const mockGetPortfolio = vi.fn()
const mockSandboxPayIn = vi.fn()
const mockGetInstruments = vi.fn()
const mockGetInstrumentPrice = vi.fn()

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }))
vi.mock("@/server/actions/helpers", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
}))
vi.mock("@/server/services", () => ({
  BrokerService: vi.fn(function () {
    return {
      connect: mockConnect,
      disconnect: mockDisconnect,
      getConnectionStatus: mockGetConnectionStatus,
      getAccounts: mockGetAccounts,
      selectAccount: mockSelectAccount,
      getPortfolio: mockGetPortfolio,
      sandboxPayIn: mockSandboxPayIn,
      getInstruments: mockGetInstruments,
      getInstrumentPrice: mockGetInstrumentPrice,
    }
  }),
}))

import {
  connectBrokerAction,
  disconnectBrokerAction,
  getBrokerStatusAction,
  getBrokerAccountsAction,
  selectBrokerAccountAction,
  getPortfolioAction,
  sandboxPayInAction,
  getInstrumentsAction,
  findInstrumentByTickerAction,
  getInstrumentPriceAction,
} from "@/server/actions/broker-actions"
import { getCurrentUserId } from "@/server/actions/helpers"

const mockAccounts = [{ id: "acc-1", name: "Main Account" }]
const mockInstrument = { ticker: "SBER", name: "Сбербанк", figi: "BBG004730N88" }

describe("broker-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue(mockAccounts)
    mockDisconnect.mockResolvedValue(undefined)
    mockGetConnectionStatus.mockResolvedValue({ connected: true, accountId: "acc-1" })
    mockGetAccounts.mockResolvedValue(mockAccounts)
    mockSelectAccount.mockResolvedValue(undefined)
    mockGetPortfolio.mockResolvedValue({ positions: [], totalAmount: 0 })
    mockSandboxPayIn.mockResolvedValue(undefined)
    mockGetInstruments.mockResolvedValue([mockInstrument])
    mockGetInstrumentPrice.mockResolvedValue(250)
  })

  describe("connectBrokerAction", () => {
    it("returns errorResponse when token is empty string", async () => {
      const res = await connectBrokerAction("")
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toBeTruthy()
    })

    it("returns errorResponse when token is whitespace only", async () => {
      const res = await connectBrokerAction("   ")
      expect(res.success).toBe(false)
    })

    it("calls getCurrentUserId and returns successResponse with accounts on valid token", async () => {
      const res = await connectBrokerAction("valid-token")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toEqual(mockAccounts)
    })

    it("returns errorResponse when service throws", async () => {
      mockConnect.mockRejectedValue(new Error("Connection failed"))
      const res = await connectBrokerAction("token")
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toBe("Connection failed")
    })
  })

  describe("disconnectBrokerAction", () => {
    it("calls getCurrentUserId and returns successResponse(null)", async () => {
      const res = await disconnectBrokerAction()
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toBeNull()
    })

    it("returns errorResponse when service throws", async () => {
      mockDisconnect.mockRejectedValue(new Error("Disconnect error"))
      const res = await disconnectBrokerAction()
      expect(res.success).toBe(false)
    })
  })

  describe("getBrokerStatusAction", () => {
    it("calls getCurrentUserId and returns successResponse with status", async () => {
      const res = await getBrokerStatusAction()
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.connected).toBe(true)
        expect(res.data.accountId).toBe("acc-1")
      }
    })

    it("returns errorResponse when service throws", async () => {
      mockGetConnectionStatus.mockRejectedValue(new Error("Status error"))
      const res = await getBrokerStatusAction()
      expect(res.success).toBe(false)
    })
  })

  describe("getBrokerAccountsAction", () => {
    it("calls getCurrentUserId and returns successResponse with accounts", async () => {
      const res = await getBrokerAccountsAction()
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toEqual(mockAccounts)
    })
  })

  describe("selectBrokerAccountAction", () => {
    it("calls selectAccount with userId and accountId", async () => {
      const res = await selectBrokerAccountAction("acc-1")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockSelectAccount).toHaveBeenCalledWith("user-1", "acc-1")
      expect(res.success).toBe(true)
    })
  })

  describe("getPortfolioAction", () => {
    it("calls getCurrentUserId and returns successResponse with portfolio", async () => {
      const res = await getPortfolioAction()
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
    })
  })

  describe("sandboxPayInAction", () => {
    it("returns errorResponse when amount <= 0", async () => {
      const res = await sandboxPayInAction(0)
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toContain("Сумма")
    })

    it("returns errorResponse when amount > 10_000_000", async () => {
      const res = await sandboxPayInAction(10_000_001)
      expect(res.success).toBe(false)
    })

    it("calls sandboxPayIn with correct args on valid amount", async () => {
      const res = await sandboxPayInAction(5000)
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(mockSandboxPayIn).toHaveBeenCalledWith("user-1", 5000)
      expect(res.success).toBe(true)
    })
  })

  describe("getInstrumentsAction", () => {
    it("returns instruments for given type", async () => {
      const res = await getInstrumentsAction("STOCK")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toEqual([mockInstrument])
    })
  })

  describe("findInstrumentByTickerAction", () => {
    it("returns found instrument when ticker matches", async () => {
      const res = await findInstrumentByTickerAction("SBER")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toEqual(mockInstrument)
    })

    it("returns null when not found in any type", async () => {
      mockGetInstruments.mockResolvedValue([])
      const res = await findInstrumentByTickerAction("UNKNOWN")
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toBeNull()
    })
  })

  describe("getInstrumentPriceAction", () => {
    it("returns { price } on success", async () => {
      const res = await getInstrumentPriceAction("SBER")
      expect(getCurrentUserId).toHaveBeenCalled()
      expect(res.success).toBe(true)
      if (res.success) expect(res.data).toEqual({ price: 250 })
    })

    it("returns errorResponse when service throws", async () => {
      mockGetInstrumentPrice.mockRejectedValue(new Error("Price unavailable"))
      const res = await getInstrumentPriceAction("SBER")
      expect(res.success).toBe(false)
      if (!res.success) expect(res.error).toBe("Price unavailable")
    })
  })
})
