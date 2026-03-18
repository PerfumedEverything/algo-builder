import type { AiGeneratedStrategy } from "@/core/types"
import type { AiProvider } from "./types"

export class MockAiProvider implements AiProvider {
  async generateStrategy(_prompt: string): Promise<AiGeneratedStrategy> {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return {
      name: "RSI стратегия на Сбер",
      instrument: "sber",
      instrumentType: "STOCK",
      timeframe: "1d",
      description: "Покупка при перепроданности RSI, продажа при перекупленности",
      config: {
        entry: {
          indicator: "RSI",
          params: { period: 14 },
          condition: "LESS_THAN",
          value: 30,
        },
        exit: {
          indicator: "RSI",
          params: { period: 14 },
          condition: "GREATER_THAN",
          value: 70,
        },
        risks: {
          stopLoss: 3,
          takeProfit: 6,
          maxPositionSize: 10,
          trailingStop: 1.5,
        },
      },
    }
  }
}
