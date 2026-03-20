"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, Loader2, CheckCircle2 } from "lucide-react"

import type { AiGeneratedStrategy } from "@/core/types"
import type { AiChatMessage } from "@/server/providers/ai/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useStrategyStore } from "@/hooks/use-strategy-store"
import { chatStrategyAction } from "@/server/actions/strategy-actions"

type AiChatProps = {
  onGenerated: (strategy: AiGeneratedStrategy) => void
}

type ChatMessage = AiChatMessage & {
  strategy?: AiGeneratedStrategy
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Привет! Давайте создадим торговую стратегию. Какой инструмент вас интересует? Например, акции Сбера, Газпрома или что-то другое?",
}

const StrategyPreview = ({
  strategy,
  onApply,
  applied,
}: {
  strategy: AiGeneratedStrategy
  onApply: () => void
  applied: boolean
}) => {
  const { config } = strategy
  const entryLabels = config.entry.map((c) => `${c.indicator} ${c.condition} ${c.value ?? ""}`.trim())
  const exitLabels = config.exit.map((c) => `${c.indicator} ${c.condition} ${c.value ?? ""}`.trim())

  return (
    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm font-medium">{strategy.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{strategy.description}</p>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>Вход: {entryLabels.join(` ${config.entryLogic === "AND" ? "И" : "ИЛИ"} `)}</p>
        <p>Выход: {exitLabels.join(` ${config.exitLogic === "AND" ? "И" : "ИЛИ"} `)}</p>
        <p>
          SL: {config.risks.stopLoss ?? "—"}% | TP: {config.risks.takeProfit ?? "—"}%
          {config.risks.trailingStop ? ` | Trailing: ${config.risks.trailingStop}%` : ""}
        </p>
      </div>
      {applied ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Применено — проверьте вкладки
        </div>
      ) : (
        <Button size="sm" className="mt-2 w-full" onClick={onApply}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Применить стратегию
        </Button>
      )}
    </div>
  )
}

export const AiChat = ({ onGenerated }: AiChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { setFromAI, setIsGenerating } = useStrategyStore()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setIsGenerating(true)

    try {
      const chatHistory: AiChatMessage[] = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const result = await chatStrategyAction(chatHistory)
      if (result.success) {
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: result.data.message,
          strategy: result.data.strategy,
        }
        setMessages([...newMessages, assistantMsg])
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: `Ошибка: ${result.error}` },
        ])
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Произошла ошибка. Попробуйте ещё раз." },
      ])
    } finally {
      setLoading(false)
      setIsGenerating(false)
      inputRef.current?.focus()
    }
  }

  const handleApply = (strategy: AiGeneratedStrategy) => {
    setFromAI(strategy.config)
    onGenerated(strategy)
    setApplied(true)
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/10 px-4 py-2.5 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        AI Помощник
      </div>

      <ScrollArea className="h-56">
        <div ref={scrollRef} className="space-y-3 p-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.strategy && (
                  <StrategyPreview
                    strategy={msg.strategy}
                    onApply={() => handleApply(msg.strategy!)}
                    applied={applied}
                  />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Думаю...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 border-t border-primary/10 p-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Напишите сообщение..."
          disabled={loading}
          className="bg-background"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
