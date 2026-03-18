import type { AiGeneratedStrategy } from "@/core/types"

export interface AiProvider {
  generateStrategy(prompt: string): Promise<AiGeneratedStrategy>
}
