import type { AiGeneratedStrategy } from "@/core/types"

export type AiChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type AiChatResponse = {
  message: string
  strategy?: AiGeneratedStrategy
}

export interface AiProvider {
  generateStrategy(prompt: string): Promise<AiGeneratedStrategy>
  chatAboutStrategy(messages: AiChatMessage[]): Promise<AiChatResponse>
}
