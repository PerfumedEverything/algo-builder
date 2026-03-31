import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '@/core/errors/app-error'

const mockRepo = vi.hoisted(() => ({
  findByUserId: vi.fn().mockResolvedValue([]),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getStats: vi.fn(),
}))

const mockAiProvider = vi.hoisted(() => ({
  generateStrategy: vi.fn(),
  chatAboutStrategy: vi.fn(),
}))

vi.mock('@/server/repositories/strategy-repository', () => {
  function StrategyRepository(this: unknown) {
    return mockRepo
  }
  return { StrategyRepository }
})

vi.mock('@/server/repositories', () => {
  function StrategyRepository(this: unknown) {
    return mockRepo
  }
  return { StrategyRepository }
})

import { StrategyService } from '@/server/services/strategy-service'

const VALID_CONFIG = {
  entry: [{ indicator: 'RSI' as const, params: { period: 14 }, condition: 'GREATER_THAN' as const, value: 30 }],
  exit: [{ indicator: 'RSI' as const, params: { period: 14 }, condition: 'LESS_THAN' as const, value: 70 }],
  entryLogic: 'AND' as const,
  exitLogic: 'AND' as const,
  risks: { stopLoss: 2, takeProfit: 4 },
}

const INVALID_CONFIG = { foo: 'bar' }

const STRATEGY_OWNED = { id: 's-1', userId: 'user-1', name: 'Test', config: VALID_CONFIG, status: 'DRAFT' }

describe('StrategyService — without AI provider', () => {
  let service: StrategyService

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.findByUserId.mockResolvedValue([])
    mockRepo.findById.mockResolvedValue(STRATEGY_OWNED)
    mockRepo.create.mockResolvedValue(STRATEGY_OWNED)
    mockRepo.update.mockResolvedValue(STRATEGY_OWNED)
    mockRepo.delete.mockResolvedValue(undefined)
    mockRepo.getStats.mockResolvedValue({ total: 0, active: 0 })
    service = new StrategyService()
  })

  describe('getStrategies', () => {
    it('delegates to repository.findByUserId with filters', async () => {
      const filters = { status: 'ACTIVE', search: 'SBER' }
      const strategies = [STRATEGY_OWNED]
      mockRepo.findByUserId.mockResolvedValue(strategies)

      const result = await service.getStrategies('user-1', filters)

      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1', filters)
      expect(result).toEqual(strategies)
    })

    it('works without filters', async () => {
      await service.getStrategies('user-1')

      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1', undefined)
    })
  })

  describe('getStrategy', () => {
    it('returns strategy when owned by userId', async () => {
      const result = await service.getStrategy('s-1', 'user-1')

      expect(result).toEqual(STRATEGY_OWNED)
    })

    it('throws AppError.notFound when strategy.userId !== userId', async () => {
      mockRepo.findById.mockResolvedValue({ ...STRATEGY_OWNED, userId: 'other-user' })

      await expect(service.getStrategy('s-1', 'user-1')).rejects.toThrow(AppError)
    })

    it('throws AppError.notFound when strategy is null', async () => {
      mockRepo.findById.mockResolvedValue(null)

      await expect(service.getStrategy('s-1', 'user-1')).rejects.toThrow(AppError)
    })
  })

  describe('createStrategy', () => {
    it('calls repository.create with userId merged into data', async () => {
      await service.createStrategy('user-1', {
        name: 'My Strategy',
        instrument: 'SBER',
        timeframe: '1h',
        config: VALID_CONFIG,
      })

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', instrument: 'SBER' }))
    })

    it('throws AppError.badRequest on invalid config', async () => {
      await expect(service.createStrategy('user-1', {
        name: 'Bad',
        instrument: 'SBER',
        timeframe: '1h',
        config: INVALID_CONFIG as never,
      })).rejects.toThrow(AppError)
    })
  })

  describe('updateStrategy', () => {
    it('calls getStrategy first (ownership check), then repository.update', async () => {
      await service.updateStrategy('s-1', 'user-1', { name: 'New Name' })

      expect(mockRepo.findById).toHaveBeenCalledWith('s-1')
      expect(mockRepo.update).toHaveBeenCalledWith('s-1', 'user-1', { name: 'New Name' })
    })

    it('throws AppError.badRequest on invalid config if config provided', async () => {
      await expect(service.updateStrategy('s-1', 'user-1', {
        config: INVALID_CONFIG as never,
      })).rejects.toThrow(AppError)
    })

    it('succeeds with valid config', async () => {
      await service.updateStrategy('s-1', 'user-1', { config: VALID_CONFIG })

      expect(mockRepo.update).toHaveBeenCalled()
    })
  })

  describe('deleteStrategy', () => {
    it('pauses strategy via update, then deletes via repository.delete', async () => {
      await service.deleteStrategy('s-1', 'user-1')

      expect(mockRepo.update).toHaveBeenCalledWith('s-1', 'user-1', { status: 'PAUSED' })
      expect(mockRepo.delete).toHaveBeenCalledWith('s-1', 'user-1')
    })

    it('throws when strategy not owned', async () => {
      mockRepo.findById.mockResolvedValue({ ...STRATEGY_OWNED, userId: 'other' })

      await expect(service.deleteStrategy('s-1', 'user-1')).rejects.toThrow(AppError)
    })
  })

  describe('generateWithAI', () => {
    it('throws AppError.badRequest when no aiProvider', async () => {
      await expect(service.generateWithAI('create strategy')).rejects.toThrow(AppError)
    })
  })

  describe('chatWithAI', () => {
    it('throws AppError.badRequest when no aiProvider', async () => {
      await expect(service.chatWithAI([{ role: 'user', content: 'hello' }])).rejects.toThrow(AppError)
    })
  })

  describe('activateStrategy', () => {
    it('ownership check then updates status to ACTIVE', async () => {
      await service.activateStrategy('s-1', 'user-1')

      expect(mockRepo.findById).toHaveBeenCalledWith('s-1')
      expect(mockRepo.update).toHaveBeenCalledWith('s-1', 'user-1', { status: 'ACTIVE' })
    })
  })

  describe('deactivateStrategy', () => {
    it('ownership check then updates status to PAUSED', async () => {
      await service.deactivateStrategy('s-1', 'user-1')

      expect(mockRepo.findById).toHaveBeenCalledWith('s-1')
      expect(mockRepo.update).toHaveBeenCalledWith('s-1', 'user-1', { status: 'PAUSED' })
    })
  })

  describe('getStats', () => {
    it('delegates to repository.getStats', async () => {
      const stats = { total: 5, active: 2 }
      mockRepo.getStats.mockResolvedValue(stats)

      const result = await service.getStats('user-1')

      expect(mockRepo.getStats).toHaveBeenCalledWith('user-1')
      expect(result).toEqual(stats)
    })
  })
})

describe('StrategyService — with AI provider', () => {
  let service: StrategyService

  beforeEach(() => {
    vi.clearAllMocks()
    mockAiProvider.generateStrategy.mockResolvedValue({ config: VALID_CONFIG })
    mockAiProvider.chatAboutStrategy.mockResolvedValue('AI response')
    service = new StrategyService(mockRepo as never, mockAiProvider)
  })

  describe('generateWithAI', () => {
    it('delegates to aiProvider.generateStrategy with prompt', async () => {
      const result = await service.generateWithAI('create SBER strategy', 'TINKOFF')

      expect(mockAiProvider.generateStrategy).toHaveBeenCalledWith('create SBER strategy', 'TINKOFF')
      expect(result).toEqual({ config: VALID_CONFIG })
    })
  })

  describe('chatWithAI', () => {
    it('delegates to aiProvider.chatAboutStrategy with messages', async () => {
      const messages = [{ role: 'user' as const, content: 'adjust stop loss' }]
      const result = await service.chatWithAI(messages)

      expect(mockAiProvider.chatAboutStrategy).toHaveBeenCalledWith(messages)
      expect(result).toBe('AI response')
    })
  })
})
