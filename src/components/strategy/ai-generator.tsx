"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

import type { AiGeneratedStrategy } from "@/core/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useStrategyStore } from "@/hooks/use-strategy-store"
import { generateStrategyAction } from "@/server/actions/strategy-actions"

type AiGeneratorProps = {
  onGenerated: (strategy: AiGeneratedStrategy) => void
}

export const AiGenerator = ({ onGenerated }: AiGeneratorProps) => {
  const [prompt, setPrompt] = useState("")
  const { isGenerating, setIsGenerating, setFromAI } = useStrategyStore()

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      const result = await generateStrategyAction(prompt)
      if (result.success) {
        setFromAI(result.data.config)
        onGenerated(result.data)
        toast.success("Стратегия сгенерирована — проверьте все вкладки")
        setPrompt("")
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Ошибка генерации")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        Генератор стратегий с ИИ
      </div>
      <Textarea
        placeholder="Опишите стратегию: 'Купить Сбер когда RSI ниже 30, продать когда выше 70'"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        className="resize-none bg-background"
      />
      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="mt-3 w-full"
        size="sm"
      >
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isGenerating ? "Генерация..." : "Сгенерировать стратегию"}
      </Button>
    </div>
  )
}
