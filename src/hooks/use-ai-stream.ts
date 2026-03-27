"use client"

import { useCallback, useState } from "react"

import type { AiGeneratedStrategy } from "@/core/types"
import type { AiChatMessage, QuickAction } from "@/server/providers/ai/types"

type ChatMessage = AiChatMessage & {
  strategy?: AiGeneratedStrategy
  actions?: QuickAction[]
  hidden?: boolean
  isStreaming?: boolean
}

type SendMessageOptions = {
  hidden?: boolean
  forceCreate?: boolean
  context?: { ticker?: string; timeframe?: string; figi?: string }
}

type UseAiStreamParams = {
  onStrategyExtracted?: (s: AiGeneratedStrategy) => void
}

type UseAiStreamReturn = {
  messages: ChatMessage[]
  streamingContent: string
  thinkingContent: string
  isStreaming: boolean
  isThinking: boolean
  sendMessage: (text: string, options?: SendMessageOptions) => Promise<void>
  resetChat: () => void
  addSystemMessage: (text: string) => void
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Привет! Опишите свою торговую идею — какой инструмент, какая логика входа и выхода. Я помогу собрать из неё стратегию. Можете описать подробно или начать с общей идеи — я уточню детали.",
  },
]

const STRATEGY_QUICK_ACTIONS: QuickAction[] = [
  { label: "Создать эту стратегию", action: "CREATE" },
  { label: "Покажи другие варианты", action: "MORE" },
  { label: "Изменить риски", action: "ADJUST_RISKS" },
]

export const useAiStream = ({ onStrategyExtracted }: UseAiStreamParams): UseAiStreamReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [streamingContent, setStreamingContent] = useState("")
  const [thinkingContent, setThinkingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)

  const sendMessage = useCallback(
    async (text: string, options?: SendMessageOptions) => {
      if (!text.trim() || isStreaming) return

      const userMsg: ChatMessage = { role: "user", content: text, hidden: options?.hidden }

      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)
      setIsThinking(false)
      setStreamingContent("")
      setThinkingContent("")

      let accumulatedContent = ""
      let accumulatedThinking = ""
      let pendingStrategy: AiGeneratedStrategy | undefined

      try {
        const currentMessages = await new Promise<ChatMessage[]>((resolve) => {
          setMessages((prev) => {
            resolve(prev)
            return prev
          })
        })

        const chatHistory: AiChatMessage[] = currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatHistory,
            context: options?.context,
            forceCreate: options?.forceCreate,
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === "[DONE]") continue
            if (!trimmed.startsWith("data: ")) continue

            const jsonStr = trimmed.slice(6)
            if (jsonStr === "[DONE]") continue

            try {
              const chunk = JSON.parse(jsonStr) as { type: string; content: string }

              if (chunk.type === "thinking") {
                accumulatedThinking += chunk.content
                setThinkingContent(accumulatedThinking)
                setIsThinking(true)
              } else if (chunk.type === "content") {
                accumulatedContent += chunk.content
                setStreamingContent(accumulatedContent)
                setIsThinking(false)
              } else if (chunk.type === "strategy") {
                try {
                  pendingStrategy = JSON.parse(chunk.content) as AiGeneratedStrategy
                  if (pendingStrategy) {
                    onStrategyExtracted?.(pendingStrategy)
                  }
                } catch {
                  // ignore malformed strategy JSON
                }
              } else if (chunk.type === "done") {
                break
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
      } catch {
        accumulatedContent = "Произошла ошибка. Попробуйте ещё раз."
      } finally {
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: accumulatedContent || "...",
          strategy: pendingStrategy,
          actions: pendingStrategy ? STRATEGY_QUICK_ACTIONS : undefined,
          thinkingContent: accumulatedThinking || undefined,
        }

        setMessages((prev) => [...prev, assistantMsg])
        setStreamingContent("")
        setThinkingContent("")
        setIsStreaming(false)
        setIsThinking(false)
      }
    },
    [isStreaming, onStrategyExtracted],
  )

  const resetChat = useCallback(() => {
    setMessages(INITIAL_MESSAGES)
    setStreamingContent("")
    setThinkingContent("")
    setIsStreaming(false)
    setIsThinking(false)
  }, [])

  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content: text }])
  }, [])

  return {
    messages,
    streamingContent,
    thinkingContent,
    isStreaming,
    isThinking,
    sendMessage,
    resetChat,
    addSystemMessage,
  }
}
