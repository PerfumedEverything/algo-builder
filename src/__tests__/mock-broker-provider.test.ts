import { describe, it, expect, beforeEach } from "vitest"
import { MockBrokerProvider } from "@/server/providers/broker/mock-broker-provider"

describe("MockBrokerProvider", () => {
  let broker: MockBrokerProvider

  beforeEach(() => {
    broker = new MockBrokerProvider()
  })

  it("throws when not connected", async () => {
    await expect(broker.getAccounts()).rejects.toThrow("Broker not connected")
    await expect(broker.getPortfolio("any")).rejects.toThrow("Broker not connected")
    await expect(broker.getInstruments("STOCK")).rejects.toThrow("Broker not connected")
    await expect(broker.getCurrentPrice("any")).rejects.toThrow("Broker not connected")
  })

  it("connects successfully", async () => {
    await broker.connect("any-token")
    const accounts = await broker.getAccounts()
    expect(accounts).toHaveLength(2)
    expect(accounts[0].name).toBe("Брокерский счёт")
    expect(accounts[1].type).toBe("SANDBOX")
  })

  it("returns portfolio with positions", async () => {
    await broker.connect("token")
    const portfolio = await broker.getPortfolio("mock-account-1")

    expect(portfolio.totalAmount).toBe(1_250_000)
    expect(portfolio.positions).toHaveLength(3)

    const sber = portfolio.positions.find((p) => p.ticker === "SBER")
    expect(sber).toBeDefined()
    expect(sber!.quantity).toBe(100)
    expect(sber!.instrumentType).toBe("STOCK")
  })

  it("returns instruments list", async () => {
    await broker.connect("token")
    const instruments = await broker.getInstruments("STOCK")

    expect(instruments.length).toBeGreaterThan(0)
    expect(instruments[0]).toHaveProperty("figi")
    expect(instruments[0]).toHaveProperty("ticker")
    expect(instruments[0]).toHaveProperty("name")
    expect(instruments[0]).toHaveProperty("lot")
  })

  it("returns candles (30+ items)", async () => {
    await broker.connect("token")
    const candles = await broker.getCandles({
      instrumentId: "BBG004730N88",
      from: new Date("2024-01-01"),
      to: new Date("2024-02-01"),
      interval: "1d",
    })

    expect(candles.length).toBeGreaterThanOrEqual(30)
    const candle = candles[0]
    expect(candle).toHaveProperty("open")
    expect(candle).toHaveProperty("high")
    expect(candle).toHaveProperty("low")
    expect(candle).toHaveProperty("close")
    expect(candle).toHaveProperty("volume")
    expect(candle).toHaveProperty("time")
    expect(candle.high).toBeGreaterThanOrEqual(candle.low)
  })

  it("returns current price as number", async () => {
    await broker.connect("token")
    const price = await broker.getCurrentPrice("BBG004730N88")

    expect(typeof price).toBe("number")
    expect(price).toBeGreaterThan(0)
  })

  it("disconnects and throws again", async () => {
    await broker.connect("token")
    await broker.disconnect()
    await expect(broker.getAccounts()).rejects.toThrow("Broker not connected")
  })
})
