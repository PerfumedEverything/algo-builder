import type { StrategyConfig } from "@/core/types"

export interface AiProvider {
  generateStrategy(prompt: string): Promise<StrategyConfig>
}
