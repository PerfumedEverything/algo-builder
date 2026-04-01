import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { AiGeneratedStrategy } from "@/core/types"
import type { AiProvider, AiChatMessage, AiChatResponse, AiStreamChunk } from "./types"
import { CHAT_SYSTEM_PROMPT, getChatSystemPrompt, getSystemPrompt, getIndicatorHints, getRiskProfiles, randomItem } from "./ai-prompts"
import { generateStrategyTool } from "./ai-tools"
import { validateStrategyConfig } from "./ai-strategy-validator"

export class DeepSeekProvider implements AiProvider {
  private client: OpenAI

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl })
  }

  async generateStrategy(prompt: string, brokerType = "TINKOFF"): Promise<AiGeneratedStrategy> {
    const hints = getIndicatorHints(brokerType)
    const profiles = getRiskProfiles(brokerType)
    const seed = `\nCreativity hint: ${randomItem(hints)}\nRisk profile: ${randomItem(profiles)}`
    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: getSystemPrompt(brokerType) + seed },
        { role: "user", content: prompt },
      ],
      tools: [generateStrategyTool],
      tool_choice: { type: "function", function: { name: "create_strategy" } },
      temperature: 0.8,
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.type !== "function") {
      throw new Error("AI не вернул стратегию. Попробуйте переформулировать запрос.")
    }

    const parsed = JSON.parse(toolCall.function.arguments) as AiGeneratedStrategy
    validateStrategyConfig(parsed)
    return parsed
  }

  async chatAboutStrategy(messages: AiChatMessage[]): Promise<AiChatResponse> {
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ]

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: apiMessages,
      tools: [generateStrategyTool],
      temperature: 0.7,
    })

    const choice = response.choices[0]?.message
    if (!choice) throw new Error("AI не ответил")

    const toolCall = choice.tool_calls?.[0]
    if (toolCall && toolCall.type === "function" && toolCall.function.name === "create_strategy") {
      const parsed = JSON.parse(toolCall.function.arguments) as AiGeneratedStrategy
      validateStrategyConfig(parsed)
      return { message: choice.content || "Готово! Вот ваша стратегия:", strategy: parsed }
    }

    return { message: choice.content || "Не удалось получить ответ" }
  }

  async *chatWithThinking(messages: AiChatMessage[], forceCreate?: boolean, brokerType = "TINKOFF"): AsyncGenerator<AiStreamChunk> {
    const safeMessages = messages.filter((m) => m.role === "user" || m.role === "assistant")
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: getChatSystemPrompt(brokerType) },
      ...safeMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ]

    if (this.needsToolCall(messages, forceCreate)) {
      const response = await this.client.chat.completions.create({
        model: "deepseek-chat",
        messages: apiMessages,
        tools: [generateStrategyTool],
        temperature: 0.7,
      })

      const choice = response.choices[0]?.message
      const toolCall = choice?.tool_calls?.[0]

      if (toolCall && toolCall.type === "function" && toolCall.function.name === "create_strategy") {
        const parsed = JSON.parse(toolCall.function.arguments) as AiGeneratedStrategy
        validateStrategyConfig(parsed)
        yield { type: "strategy", content: JSON.stringify(parsed) }
      } else {
        yield { type: "content", content: choice?.content ?? "Не удалось получить ответ" }
      }

      yield { type: "done", content: "" }
      return
    }

    const stream = await this.client.chat.completions.create({
      model: "deepseek-reasoner",
      messages: apiMessages,
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as Record<string, unknown>
      if (!delta) continue
      if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
        yield { type: "thinking", content: delta.reasoning_content }
      }
      if (typeof delta.content === "string" && delta.content) {
        yield { type: "content", content: delta.content }
      }
    }

    yield { type: "done", content: "" }
  }

  private needsToolCall(messages: AiChatMessage[], forceCreate?: boolean): boolean {
    if (forceCreate) return true
    const last = messages.filter((m) => m.role === "user").pop()
    if (!last) return false
    const text = last.content.toLowerCase()
    const keywords = ["создай", "применить", "давай", "да, создай", "окей, создавай", "создавай"]
    return keywords.some((kw) => text.includes(kw))
  }
}
