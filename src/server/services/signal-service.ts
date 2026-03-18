import type { SignalCondition, SignalChannel, LogicOperator } from "@/core/types"
import { AppError } from "@/core/errors/app-error"
import { SignalRepository } from "@/server/repositories"

export class SignalService {
  constructor(private repository = new SignalRepository()) {}

  async getSignals(
    userId: string,
    filters?: { signalType?: string; isActive?: boolean; search?: string },
  ) {
    return this.repository.findByUserId(userId, filters)
  }

  async getSignal(id: string, userId: string) {
    const signal = await this.repository.findById(id)
    if (!signal || signal.userId !== userId) {
      throw AppError.notFound("Signal")
    }
    return signal
  }

  async createSignal(
    userId: string,
    data: {
      name: string
      description?: string
      instrument: string
      instrumentType?: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
      timeframe: string
      signalType: "BUY" | "SELL"
      conditions: SignalCondition[]
      channels: SignalChannel[]
      logicOperator?: LogicOperator
      strategyId?: string
    },
  ) {
    return this.repository.create({ ...data, userId })
  }

  async updateSignal(
    id: string,
    userId: string,
    data: Partial<{
      name: string
      description: string
      instrument: string
      instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
      timeframe: string
      signalType: "BUY" | "SELL"
      conditions: SignalCondition[]
      channels: SignalChannel[]
      logicOperator: LogicOperator
      isActive: boolean
    }>,
  ) {
    await this.getSignal(id, userId)
    return this.repository.update(id, userId, data)
  }

  async toggleSignal(id: string, userId: string) {
    const signal = await this.getSignal(id, userId)
    return this.repository.update(id, userId, { isActive: !signal.isActive })
  }

  async deleteSignal(id: string, userId: string) {
    await this.getSignal(id, userId)
    return this.repository.delete(id, userId)
  }

  async deactivateByStrategyId(strategyId: string, userId: string) {
    const signals = await this.repository.findByUserId(userId)
    const strategySignals = signals.filter((s) => s.strategyId === strategyId)
    for (const signal of strategySignals) {
      await this.repository.update(signal.id, userId, { isActive: false })
    }
  }

  async deleteByStrategyId(strategyId: string, userId: string) {
    const signals = await this.repository.findByUserId(userId)
    const strategySignals = signals.filter((s) => s.strategyId === strategyId)
    for (const signal of strategySignals) {
      await this.repository.delete(signal.id, userId)
    }
  }

  async getStats(userId: string) {
    return this.repository.getStats(userId)
  }
}
