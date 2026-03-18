import type { BrokerAccount, Portfolio, BrokerInstrument } from "@/core/types"
import { BrokerRepository } from "@/server/repositories"
import { getBrokerProvider } from "@/server/providers/broker"

export class BrokerService {
  private repo = new BrokerRepository()
  private provider = getBrokerProvider()

  async connect(userId: string, token: string): Promise<BrokerAccount[]> {
    await this.provider.connect(token)
    await this.repo.saveToken(userId, token)
    const accounts = await this.provider.getAccounts()
    if (accounts.length > 0) {
      await this.repo.saveAccountId(userId, accounts[0].id)
    }
    return accounts
  }

  async disconnect(userId: string): Promise<void> {
    await this.provider.disconnect()
    await this.repo.disconnect(userId)
  }

  async getAccounts(userId: string): Promise<BrokerAccount[]> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.brokerToken) return []
    await this.provider.connect(settings.brokerToken)
    return this.provider.getAccounts()
  }

  async getPortfolio(userId: string): Promise<Portfolio | null> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.brokerToken || !settings.brokerAccountId) return null
    await this.provider.connect(settings.brokerToken)
    return this.provider.getPortfolio(settings.brokerAccountId)
  }

  async getInstruments(userId: string, type: string): Promise<BrokerInstrument[]> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.brokerToken) return []
    await this.provider.connect(settings.brokerToken)
    return this.provider.getInstruments(type)
  }

  async getCurrentPrice(userId: string, instrumentId: string): Promise<number | null> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.brokerToken) return null
    await this.provider.connect(settings.brokerToken)
    return this.provider.getCurrentPrice(instrumentId)
  }

  async selectAccount(userId: string, accountId: string): Promise<void> {
    await this.repo.saveAccountId(userId, accountId)
  }

  async sandboxPayIn(userId: string, amount: number): Promise<void> {
    const settings = await this.repo.getSettings(userId)
    if (!settings?.brokerToken || !settings.brokerAccountId) {
      throw new Error("Брокер не подключён или счёт не выбран")
    }
    await this.provider.connect(settings.brokerToken)
    if (!this.provider.sandboxPayIn) {
      throw new Error("Пополнение доступно только для sandbox")
    }
    await this.provider.sandboxPayIn(settings.brokerAccountId, amount)
  }

  async getConnectionStatus(userId: string) {
    const settings = await this.repo.getSettings(userId)
    return {
      connected: !!settings?.brokerToken,
      accountId: settings?.brokerAccountId ?? null,
    }
  }
}
