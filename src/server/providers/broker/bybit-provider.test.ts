import { describe, it, expect, vi, beforeEach } from "vitest"
import { BybitProvider } from "./bybit-provider"
import { BYBIT_CRYPTO_PAIRS } from "./bybit-constants"

const mockClientInstance = vi.hoisted(() => ({
  getWalletBalance: vi.fn(),
  getPositionInfo: vi.fn(),
  getKline: vi.fn(),
  getTickers: vi.fn(),
  submitOrder: vi.fn(),
  cancelOrder: vi.fn(),
}))

vi.mock("bybit-api", () => {
  function MockRestClientV5() {
    return mockClientInstance
  }
  return { RestClientV5: MockRestClientV5 }
})

const makeWalletResponse = (overrides = {}) => ({
  retCode: 0,
  result: {
    list: [
      {
        totalEquity: "50000",
        totalPerpUPL: "1200",
        totalAvailableBalance: "35000",
        ...overrides,
      },
    ],
  },
})

const makePositionsResponse = (positions: Record<string, string>[] = []) => ({
  retCode: 0,
  result: { list: positions },
})

describe("BybitProvider", () => {
  let provider: BybitProvider
  let mockClient: typeof mockClientInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    provider = new BybitProvider()
    await provider.connect("testkey:testsecret")
    mockClient = mockClientInstance
  })

  it("connect: creates client without throwing", async () => {
    const p = new BybitProvider()
    await expect(p.connect("key:secret")).resolves.toBeUndefined()
  })

  it("connect: handles secrets with colons in them", async () => {
    const p = new BybitProvider()
    await expect(p.connect("key:secret:with:colons")).resolves.toBeUndefined()
  })

  it("getAccounts: returns single BYBIT account", async () => {
    mockClient.getWalletBalance.mockResolvedValue(makeWalletResponse())
    const accounts = await provider.getAccounts()
    expect(accounts).toHaveLength(1)
    expect(accounts[0].type).toBe("BYBIT")
    expect(accounts[0].id).toBe("bybit-unified")
  })

  it("getPortfolio: returns totalEquity and CRYPTO positions with unrealisedPnl", async () => {
    mockClient.getWalletBalance.mockResolvedValue(makeWalletResponse())
    mockClient.getPositionInfo.mockResolvedValue(
      makePositionsResponse([
        {
          symbol: "BTCUSDT",
          side: "Buy",
          size: "0.1",
          avgPrice: "60000",
          markPrice: "62000",
          unrealisedPnl: "200",
          cumRealisedPnl: "500",
          positionValue: "6200",
        },
      ]),
    )

    const portfolio = await provider.getPortfolio("bybit-unified")
    expect(portfolio.totalAmount).toBe(50000)
    expect(portfolio.availableCash).toBe(35000)
    expect(portfolio.positions).toHaveLength(1)
    expect(portfolio.positions[0].instrumentType).toBe("CRYPTO")
    expect(portfolio.positions[0].expectedYieldAbsolute).toBe(200)
    expect(portfolio.positions[0].ticker).toBe("BTCUSDT")
  })

  it("getCandles: returns candles in oldest-first order (reversed)", async () => {
    const newestFirst = [
      ["1700010000000", "65000", "65500", "64800", "65200", "10", "650000"],
      ["1700000000000", "64000", "64800", "63900", "65000", "12", "780000"],
      ["1699990000000", "63000", "64100", "62800", "64000", "15", "900000"],
    ]
    mockClient.getKline.mockResolvedValue({ retCode: 0, result: { list: newestFirst } })

    const candles = await provider.getCandles({
      instrumentId: "BTCUSDT",
      from: new Date("2023-11-01"),
      to: new Date("2023-11-02"),
      interval: "1h",
    })

    expect(candles).toHaveLength(3)
    expect(candles[0].time).toEqual(new Date(1699990000000))
    expect(candles[2].time).toEqual(new Date(1700010000000))
    expect(typeof candles[0].open).toBe("number")
    expect(typeof candles[0].close).toBe("number")
  })

  it("getCurrentPrice: returns parsed lastPrice", async () => {
    mockClient.getTickers.mockResolvedValue({
      retCode: 0,
      result: { list: [{ lastPrice: "67234.50" }] },
    })

    const price = await provider.getCurrentPrice("BTCUSDT")
    expect(price).toBe(67234.5)
  })

  it("placeOrder: returns orderId from submitOrder response", async () => {
    mockClient.submitOrder.mockResolvedValue({
      retCode: 0,
      result: { orderId: "order-123" },
    })

    const orderId = await provider.placeOrder({
      symbol: "BTCUSDT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 0.1,
      accountId: "bybit-unified",
    })

    expect(orderId).toBe("order-123")
    expect(mockClient.submitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "linear",
        symbol: "BTCUSDT",
        side: "Buy",
        orderType: "Market",
        qty: "0.1",
      }),
    )
  })

  it("cancelOrder: calls client.cancelOrder with correct params", async () => {
    mockClient.cancelOrder.mockResolvedValue({ retCode: 0, result: {} })

    await provider.cancelOrder("order-456", "BTCUSDT")

    expect(mockClient.cancelOrder).toHaveBeenCalledWith({
      category: "linear",
      symbol: "BTCUSDT",
      orderId: "order-456",
    })
  })

  it("getAvailableCash: returns parsed totalAvailableBalance", async () => {
    mockClient.getWalletBalance.mockResolvedValue(makeWalletResponse())
    const cash = await provider.getAvailableCash("bybit-unified")
    expect(cash).toBe(35000)
  })

  it("getInstruments('CRYPTO'): returns BYBIT_CRYPTO_PAIRS mapped with type CRYPTO", async () => {
    const instruments = await provider.getInstruments("CRYPTO")
    expect(instruments).toHaveLength(BYBIT_CRYPTO_PAIRS.length)
    expect(instruments[0].type).toBe("CRYPTO")
    expect(instruments[0].ticker).toBe(BYBIT_CRYPTO_PAIRS[0].symbol)
  })

  it("getInstruments('STOCK'): returns empty array", async () => {
    const instruments = await provider.getInstruments("STOCK")
    expect(instruments).toHaveLength(0)
  })
})
