import type { BrokerAccount, Portfolio, BrokerInstrument, Candle, CandleParams } from "@/core/types"
import { BrokerRepository } from "@/server/repositories"
import { getBrokerProvider } from "@/server/providers/broker"
import { filterValidCandles } from "./candle-validator"

export class BrokerService {
  private repo = new BrokerRepository()

  async connect(userId: string, token: string): Promise<BrokerAccount[]> {
    const provider = await getBrokerProvider(userId)
    await provider.connect(token)
    await this.repo.saveToken(userId, token)
    const accounts = await provider.getAccounts()
    if (accounts.length > 0) {
      await this.repo.saveAccountId(userId, accounts[0].id)
    }
    return accounts
  }

  async disconnect(userId: string): Promise<void> {
    const provider = await getBrokerProvider(userId)
    await provider.disconnect()
    await this.repo.disconnect(userId)
  }

  async getAccounts(userId: string): Promise<BrokerAccount[]> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.connectionToken) return []
    const provider = await getBrokerProvider(userId)
    await provider.connect(settings.connectionToken)
    return provider.getAccounts()
  }

  async getPortfolio(userId: string): Promise<Portfolio | null> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.connectionToken || !settings.brokerAccountId) return null
    const provider = await getBrokerProvider(userId)
    await provider.connect(settings.connectionToken)
    return provider.getPortfolio(settings.brokerAccountId)
  }

  async getInstruments(userId: string, type: string): Promise<BrokerInstrument[]> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.connectionToken) return []
    const provider = await getBrokerProvider(userId)
    await provider.connect(settings.connectionToken)
    return provider.getInstruments(type)
  }

  async getCurrentPrice(userId: string, instrumentId: string): Promise<number | null> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.connectionToken) return null
    const provider = await getBrokerProvider(userId)
    await provider.connect(settings.connectionToken)
    return provider.getCurrentPrice(instrumentId)
  }

  async getInstrumentPrice(userId: string, ticker: string): Promise<number> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.connectionToken) throw new Error("Брокер не подключён")
    const provider = await getBrokerProvider(userId)
    await provider.connect(settings.connectionToken)
    return provider.getCurrentPrice(ticker)
  }

  async getCandles(userId: string, params: CandleParams): Promise<Candle[]> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.connectionToken) throw new Error("Брокер не подключён")
    const provider = await getBrokerProvider(userId)
    await provider.connect(settings.connectionToken)
    const candles = await provider.getCandles(params)
    return filterValidCandles(candles)
  }

  async selectAccount(userId: string, accountId: string): Promise<void> {
    await this.repo.saveAccountId(userId, accountId)
  }

  async sandboxPayIn(userId: string, amount: number): Promise<void> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.connectionToken || !settings.brokerAccountId) {
      throw new Error("Брокер не подключён или счёт не выбран")
    }
    const provider = await getBrokerProvider(userId)
    await provider.connect(settings.connectionToken)
    if (!provider.sandboxPayIn) {
      throw new Error("Пополнение доступно только для sandbox")
    }
    await provider.sandboxPayIn(settings.brokerAccountId, amount)
  }

  async getConnectionStatus(userId: string) {
    const settings = await this.repo.getSettings(userId)
    return {
      connected: !!settings?.connectionToken,
      accountId: settings?.brokerAccountId ?? null,
    }
  }
}
