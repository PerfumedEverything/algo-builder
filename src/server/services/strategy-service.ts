import type { StrategyConfig } from "@/core/types"
import { AppError } from "@/core/errors/app-error"
import { strategyConfigSchema } from "@/core/schemas"
import { StrategyRepository } from "@/server/repositories"
import type { AiProvider } from "@/server/providers/ai"

export class StrategyService {
  constructor(
    private repository = new StrategyRepository(),
    private aiProvider?: AiProvider,
  ) {}

  async getStrategies(userId: string, filters?: { status?: string; search?: string }) {
    return this.repository.findByUserId(userId, filters)
  }

  async getStrategy(id: string, userId: string) {
    const strategy = await this.repository.findById(id)
    if (!strategy || strategy.userId !== userId) {
      throw AppError.notFound("Strategy")
    }
    return strategy
  }

  async createStrategy(
    userId: string,
    data: {
      name: string
      description?: string
      instrument: string
      instrumentType?: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
      timeframe: string
      config: StrategyConfig
    },
  ) {
    const parsed = strategyConfigSchema.safeParse(data.config)
    if (!parsed.success) {
      throw AppError.badRequest("Invalid strategy config")
    }
    return this.repository.create({ ...data, userId })
  }

  async updateStrategy(
    id: string,
    userId: string,
    data: Partial<{
      name: string
      description: string
      status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"
      instrument: string
      instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
      timeframe: string
      config: StrategyConfig
    }>,
  ) {
    await this.getStrategy(id, userId)

    if (data.config) {
      const parsed = strategyConfigSchema.safeParse(data.config)
      if (!parsed.success) {
        throw AppError.badRequest("Invalid strategy config")
      }
    }
    return this.repository.update(id, userId, data)
  }

  async deleteStrategy(id: string, userId: string) {
    await this.getStrategy(id, userId)
    return this.repository.delete(id, userId)
  }

  async generateWithAI(prompt: string) {
    if (!this.aiProvider) {
      throw AppError.badRequest("AI provider not configured")
    }
    return this.aiProvider.generateStrategy(prompt)
  }

  async getStats(userId: string) {
    return this.repository.getStats(userId)
  }
}
