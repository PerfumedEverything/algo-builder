"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Send, CheckCircle2 } from "lucide-react"

import type { AiGeneratedStrategy } from "@/core/types"
import type { QuickAction } from "@/server/providers/ai/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useStrategyStore } from "@/hooks/use-strategy-store"
import { useAiStream } from "@/hooks/use-ai-stream"
import { ThinkingIndicator } from "./thinking-indicator"
import { QuickActionButtons } from "./quick-action-buttons"

type AiChatProps = {
  onGenerated: (strategy: AiGeneratedStrategy) => void
  onStrategyExtracted?: (strategy: AiGeneratedStrategy) => void
  initialContext?: string
  analysisContext?: string
  instrumentContext?: { ticker: string; timeframe: string; figi?: string }
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
  if (!("entry" in config)) return null
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

export const AiChat = ({
  onGenerated,
  onStrategyExtracted,
  initialContext,
  analysisContext,
  instrumentContext,
}: AiChatProps) => {
  const context = analysisContext ?? initialContext
  const [input, setInput] = useState("")
  const [applied, setApplied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoSentRef = useRef(false)
  const { setFromAI, setIsGenerating } = useStrategyStore()

  const { messages, streamingContent, thinkingContent, isStreaming, isThinking, sendMessage, addSystemMessage } =
    useAiStream({ onStrategyExtracted })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent, isThinking])

  useEffect(() => {
    setIsGenerating(isStreaming)
  }, [isStreaming, setIsGenerating])

  useEffect(() => {
    if (context && !autoSentRef.current) {
      autoSentRef.current = true
      void sendMessage(
        `Я только что провёл технический анализ инструмента. Вот результаты:\n\n${context}\n\nКакие стратегии ты видишь на основе этого анализа? Предложи 2-3 варианта с объяснением логики.`,
        { hidden: true, context: instrumentContext },
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput("")
    void sendMessage(text, { context: instrumentContext })
  }

  const handleApply = (strategy: AiGeneratedStrategy) => {
    setFromAI(strategy.config)
    onGenerated(strategy)
    setApplied(true)
    addSystemMessage("Стратегия создана! Можете продолжить — попросите другую стратегию или измените параметры.")
  }

  const handleQuickAction = async (action: QuickAction) => {
    if (action.action === "CREATE") {
      const strategy = await sendMessage("Да, создай эту стратегию", { forceCreate: true, context: instrumentContext })
      if (strategy) {
        setFromAI(strategy.config)
        onGenerated(strategy)
        setApplied(true)
        addSystemMessage("Стратегия создана! Можете продолжить — попросите другую стратегию или измените параметры.")
      }
    } else if (action.action === "MORE") {
      void sendMessage("Покажи другой вариант", { context: instrumentContext })
    } else if (action.action === "ADJUST_RISKS") {
      void sendMessage("Сделай риски консервативнее", { context: instrumentContext })
    }
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/10 px-4 py-2.5 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        AI Помощник
      </div>

      <ScrollArea className="h-80">
        <div ref={scrollRef} className="space-y-3 p-4">
          {messages.filter((m) => !m.hidden).map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
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
                {msg.actions && <QuickActionButtons actions={msg.actions} onAction={handleQuickAction} />}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <ThinkingIndicator thinkingContent={thinkingContent} />
            </div>
          )}
          {isStreaming && !isThinking && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="whitespace-pre-wrap">{streamingContent}</p>
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
          disabled={isStreaming}
          className="bg-background"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
