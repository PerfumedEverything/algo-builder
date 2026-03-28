import type { AiGeneratedStrategy } from "@/core/types"

export type AiChatMessage = {
  role: "user" | "assistant"
  content: string
  thinkingContent?: string
}

export type AiChatResponse = {
  message: string
  strategy?: AiGeneratedStrategy
  thinkingContent?: string
}

export type AiStreamChunk = {
  type: "thinking" | "content" | "strategy" | "done"
  content: string
}

export type QuickAction = {
  label: string
  action: "CREATE" | "MORE" | "ADJUST_RISKS"
  payload?: Record<string, unknown>
}

export type AiContextParams = {
  ticker: string
  timeframe: string
  userId: string
  figi?: string
}

export interface AiProvider {
  generateStrategy(prompt: string, brokerType?: string): Promise<AiGeneratedStrategy>
  chatAboutStrategy(messages: AiChatMessage[]): Promise<AiChatResponse>
  chatWithThinking?(messages: AiChatMessage[], forceCreate?: boolean): AsyncGenerator<AiStreamChunk>
}
