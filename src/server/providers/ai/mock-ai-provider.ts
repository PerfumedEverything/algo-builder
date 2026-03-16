import type { StrategyConfig } from "@/core/types"
import type { AiProvider } from "./types"

export class MockAiProvider implements AiProvider {
  async generateStrategy(_prompt: string): Promise<StrategyConfig> {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return {
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
    }
  }
}
