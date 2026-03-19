import type { SignalCondition, SignalChannel, LogicOperator } from "@/core/types"
import { AppError } from "@/core/errors/app-error"
import { SignalRepository } from "@/server/repositories"

export class SignalService {
  constructor(private repository = new SignalRepository()) {}

  async getSignals(
    userId: string,
    filters?: { signalType?: string; isActive?: boolean; triggered?: string; search?: string },
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
      signalType: "BUY" | "SELL" | "ALERT"
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
      signalType: "BUY" | "SELL" | "ALERT"
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

  async getStats(userId: string) {
    return this.repository.getStats(userId)
  }
}
