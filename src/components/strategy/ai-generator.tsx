"use client"

import { useState } from "react"
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react"

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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const { setIsGenerating, setFromAI } = useStrategyStore()

  const handleGenerate = async () => {
    if (!prompt.trim() || status === "loading") return

    setStatus("loading")
    setIsGenerating(true)
    setErrorMsg("")
    try {
      const result = await generateStrategyAction(prompt)
      if (result.success) {
        setFromAI(result.data.config)
        onGenerated(result.data)
        setStatus("success")
        setPrompt("")
        setTimeout(() => setStatus("idle"), 3000)
      } else {
        setErrorMsg(result.error)
        setStatus("error")
        setTimeout(() => setStatus("idle"), 4000)
      }
    } catch {
      setErrorMsg("Ошибка генерации")
      setStatus("error")
      setTimeout(() => setStatus("idle"), 4000)
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
        disabled={!prompt.trim() || status === "loading"}
        className="mt-3 w-full"
        size="sm"
      >
        {status === "loading" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {status === "loading" ? "Генерация..." : "Сгенерировать стратегию"}
      </Button>

      {status === "success" && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Стратегия сгенерирована — проверьте все вкладки
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {errorMsg}
        </div>
      )}
    </div>
  )
}
