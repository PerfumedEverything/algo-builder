import type { StrategyConfig } from "@/core/types"
import { AppError } from "@/core/errors/app-error"
import { strategyConfigSchema } from "@/core/schemas"
import { StrategyRepository } from "@/server/repositories"
import { SignalService } from "./signal-service"
import type { AiProvider } from "@/server/providers/ai"

export class StrategyService {
  constructor(
    private repository = new StrategyRepository(),
    private aiProvider?: AiProvider,
    private signalService = new SignalService(),
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

  async activateStrategy(id: string, userId: string) {
    const strategy = await this.getStrategy(id, userId)

    await this.signalService.deleteByStrategyId(id, userId)

    const config = strategy.config as StrategyConfig

    await this.signalService.createSignal(userId, {
      name: `${strategy.name} — Вход`,
      description: `Автосигнал входа для стратегии "${strategy.name}"`,
      instrument: strategy.instrument,
      instrumentType: strategy.instrumentType as "STOCK" | "BOND" | "CURRENCY" | "FUTURES",
      timeframe: strategy.timeframe,
      signalType: "BUY",
      conditions: config.entry,
      channels: ["telegram"],
      logicOperator: config.entryLogic ?? "AND",
      strategyId: id,
    })

    await this.signalService.createSignal(userId, {
      name: `${strategy.name} — Выход`,
      description: `Автосигнал выхода для стратегии "${strategy.name}"`,
      instrument: strategy.instrument,
      instrumentType: strategy.instrumentType as "STOCK" | "BOND" | "CURRENCY" | "FUTURES",
      timeframe: strategy.timeframe,
      signalType: "SELL",
      conditions: config.exit,
      channels: ["telegram"],
      logicOperator: config.exitLogic ?? "AND",
      strategyId: id,
    })

    return this.repository.update(id, userId, { status: "ACTIVE" })
  }

  async deactivateStrategy(id: string, userId: string) {
    await this.getStrategy(id, userId)
    await this.signalService.deactivateByStrategyId(id, userId)
    return this.repository.update(id, userId, { status: "PAUSED" })
  }

  async getStats(userId: string) {
    return this.repository.getStats(userId)
  }
}
