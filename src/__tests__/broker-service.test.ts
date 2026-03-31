import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProvider = vi.hoisted(() => ({
  connect: vi.fn(),
  getAccounts: vi.fn().mockResolvedValue([]),
  getPortfolio: vi.fn(),
  getInstruments: vi.fn().mockResolvedValue([]),
  getCurrentPrice: vi.fn(),
  getCandles: vi.fn().mockResolvedValue([]),
  disconnect: vi.fn(),
  sandboxPayIn: vi.fn(),
}))

const mockRepo = vi.hoisted(() => ({
  saveToken: vi.fn(),
  saveAccountId: vi.fn(),
  getSettings: vi.fn(),
  disconnect: vi.fn(),
  getBrokerType: vi.fn(),
}))

vi.mock('@/server/providers/broker', () => ({
  getBrokerProvider: vi.fn().mockResolvedValue(mockProvider),
}))

vi.mock('@/server/repositories/broker-repository', () => {
  function BrokerRepository(this: unknown) {
    return mockRepo
  }
  return { BrokerRepository }
})

vi.mock('@/server/repositories', () => {
  function BrokerRepository(this: unknown) {
    return mockRepo
  }
  return { BrokerRepository }
})

vi.mock('@/server/services/candle-validator', () => ({
  filterValidCandles: vi.fn((c: unknown[]) => c),
}))

import { BrokerService } from '@/server/services/broker-service'

const DEFAULT_SETTINGS = { connectionToken: 'tok', brokerAccountId: 'acc-1' }

describe('BrokerService', () => {
  let service: BrokerService

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getSettings.mockResolvedValue(DEFAULT_SETTINGS)
    mockRepo.saveToken.mockResolvedValue(undefined)
    mockRepo.saveAccountId.mockResolvedValue(undefined)
    mockRepo.disconnect.mockResolvedValue(undefined)
    mockProvider.connect.mockResolvedValue(undefined)
    mockProvider.disconnect.mockResolvedValue(undefined)
    mockProvider.getAccounts.mockResolvedValue([])
    mockProvider.getCandles.mockResolvedValue([])
    mockProvider.getInstruments.mockResolvedValue([])
    service = new BrokerService()
  })

  describe('connect', () => {
    it('saves token, connects provider and returns accounts', async () => {
      const accounts = [{ id: 'acc-1', name: 'Main' }]
      mockProvider.getAccounts.mockResolvedValue(accounts)

      const result = await service.connect('user-1', 'token123')

      expect(mockRepo.saveToken).toHaveBeenCalledWith('user-1', 'token123')
      expect(mockProvider.connect).toHaveBeenCalledWith('token123')
      expect(result).toEqual(accounts)
    })

    it('auto-saves first account ID when accounts are returned', async () => {
      mockProvider.getAccounts.mockResolvedValue([{ id: 'acc-1' }, { id: 'acc-2' }])

      await service.connect('user-1', 'token123')

      expect(mockRepo.saveAccountId).toHaveBeenCalledWith('user-1', 'acc-1')
    })

    it('does NOT call saveAccountId when no accounts returned', async () => {
      mockProvider.getAccounts.mockResolvedValue([])

      await service.connect('user-1', 'token123')

      expect(mockRepo.saveAccountId).not.toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('calls provider.disconnect and repo.disconnect', async () => {
      await service.disconnect('user-1')

      expect(mockProvider.disconnect).toHaveBeenCalled()
      expect(mockRepo.disconnect).toHaveBeenCalledWith('user-1')
    })
  })

  describe('getAccounts', () => {
    it('returns [] when no connectionToken in settings', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      const result = await service.getAccounts('user-1')

      expect(result).toEqual([])
    })

    it('connects provider and returns accounts when token exists', async () => {
      const accounts = [{ id: 'acc-1' }]
      mockProvider.getAccounts.mockResolvedValue(accounts)

      const result = await service.getAccounts('user-1')

      expect(mockProvider.connect).toHaveBeenCalledWith('tok')
      expect(result).toEqual(accounts)
    })
  })

  describe('getPortfolio', () => {
    it('returns null when no connectionToken', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      const result = await service.getPortfolio('user-1')

      expect(result).toBeNull()
    })

    it('returns null when no brokerAccountId', async () => {
      mockRepo.getSettings.mockResolvedValue({ connectionToken: 'tok' })

      const result = await service.getPortfolio('user-1')

      expect(result).toBeNull()
    })

    it('connects and returns portfolio when both token and accountId exist', async () => {
      const portfolio = { positions: [] }
      mockProvider.getPortfolio = vi.fn().mockResolvedValue(portfolio)

      const result = await service.getPortfolio('user-1')

      expect(mockProvider.connect).toHaveBeenCalledWith('tok')
      expect(mockProvider.getPortfolio).toHaveBeenCalledWith('acc-1')
      expect(result).toEqual(portfolio)
    })
  })

  describe('getInstruments', () => {
    it('returns [] when no connectionToken', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      const result = await service.getInstruments('user-1', 'STOCK')

      expect(result).toEqual([])
    })

    it('returns instruments when token exists', async () => {
      const instruments = [{ ticker: 'SBER' }]
      mockProvider.getInstruments.mockResolvedValue(instruments)

      const result = await service.getInstruments('user-1', 'STOCK')

      expect(result).toEqual(instruments)
    })
  })

  describe('getCurrentPrice', () => {
    it('returns null when no connectionToken', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      const result = await service.getCurrentPrice('user-1', 'SBER')

      expect(result).toBeNull()
    })

    it('returns price from provider when token exists', async () => {
      mockProvider.getCurrentPrice = vi.fn().mockResolvedValue(250)

      const result = await service.getCurrentPrice('user-1', 'SBER')

      expect(result).toBe(250)
    })
  })

  describe('getInstrumentPrice', () => {
    it('throws "Брокер не подключён" when no connectionToken', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      await expect(service.getInstrumentPrice('user-1', 'SBER')).rejects.toThrow('Брокер не подключён')
    })

    it('returns price from provider when connected', async () => {
      mockProvider.getCurrentPrice = vi.fn().mockResolvedValue(300)

      const result = await service.getInstrumentPrice('user-1', 'SBER')

      expect(result).toBe(300)
    })
  })

  describe('getCandles', () => {
    it('throws "Брокер не подключён" when no connectionToken', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      await expect(service.getCandles('user-1', { ticker: 'SBER', interval: '1min', from: new Date(), to: new Date() })).rejects.toThrow('Брокер не подключён')
    })

    it('calls filterValidCandles on provider result', async () => {
      const { filterValidCandles } = await import('@/server/services/candle-validator')
      const candles = [{ open: 100, high: 110, low: 90, close: 105, volume: 1000, time: new Date() }]
      mockProvider.getCandles.mockResolvedValue(candles)

      await service.getCandles('user-1', { ticker: 'SBER', interval: '1min', from: new Date(), to: new Date() })

      expect(filterValidCandles).toHaveBeenCalledWith(candles)
    })
  })

  describe('selectAccount', () => {
    it('delegates to repo.saveAccountId', async () => {
      await service.selectAccount('user-1', 'acc-2')

      expect(mockRepo.saveAccountId).toHaveBeenCalledWith('user-1', 'acc-2')
    })
  })

  describe('sandboxPayIn', () => {
    it('throws when no connectionToken', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      await expect(service.sandboxPayIn('user-1', 1000)).rejects.toThrow()
    })

    it('throws when no brokerAccountId', async () => {
      mockRepo.getSettings.mockResolvedValue({ connectionToken: 'tok' })

      await expect(service.sandboxPayIn('user-1', 1000)).rejects.toThrow()
    })

    it('throws "Пополнение доступно только для sandbox" when provider has no sandboxPayIn', async () => {
      const providerWithoutSandbox = { ...mockProvider, sandboxPayIn: undefined }
      const { getBrokerProvider } = await import('@/server/providers/broker')
      ;(getBrokerProvider as ReturnType<typeof vi.fn>).mockResolvedValueOnce(providerWithoutSandbox)

      await expect(service.sandboxPayIn('user-1', 1000)).rejects.toThrow('Пополнение доступно только для sandbox')
    })

    it('calls provider.sandboxPayIn with correct args', async () => {
      await service.sandboxPayIn('user-1', 5000)

      expect(mockProvider.sandboxPayIn).toHaveBeenCalledWith('acc-1', 5000)
    })
  })

  describe('getConnectionStatus', () => {
    it('returns { connected: false, accountId: null } when no settings', async () => {
      mockRepo.getSettings.mockResolvedValue(null)

      const result = await service.getConnectionStatus('user-1')

      expect(result).toEqual({ connected: false, accountId: null })
    })

    it('returns { connected: true, accountId: "acc-1" } when both exist', async () => {
      const result = await service.getConnectionStatus('user-1')

      expect(result).toEqual({ connected: true, accountId: 'acc-1' })
    })
  })
})
