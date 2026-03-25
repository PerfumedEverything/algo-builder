"use client"

import { useState } from "react"
import { Bot, Loader2 } from "lucide-react"
import Markdown from "react-markdown"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type AiAnalysisButtonProps = {
  title: string
  triggerLabel?: string
  triggerLabelMobile?: string
  triggerIcon?: React.ReactNode
  analyzeAction: () => Promise<{ success: boolean; data?: string; error?: string }>
  onResult?: (result: string) => void
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
}

export const AiAnalysisButton = ({
  title,
  triggerLabel = "Анализ с ИИ",
  triggerLabelMobile,
  triggerIcon = <Bot className="h-4 w-4" />,
  analyzeAction,
  onResult,
  variant = "default",
  size = "sm",
}: AiAnalysisButtonProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await analyzeAction()
    if (res.success && res.data) {
      setResult(res.data)
      onResult?.(res.data)
    } else {
      setError(res.error ?? "Ошибка анализа")
    }
    setLoading(false)
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && !result && !loading) {
      handleAnalyze()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={variant === "default" ? "gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" : "gap-1.5"}
        >
          {triggerIcon}
          {triggerLabelMobile ? (
            <>
              <span className="hidden sm:inline">{triggerLabel}</span>
              <span className="sm:hidden">{triggerLabelMobile}</span>
            </>
          ) : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Анализирую...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border/50 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_th]:border [&_th]:border-border/50 [&_th]:bg-muted/30 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_th]:font-medium">
            <Markdown>{result}</Markdown>
          </div>
        )}

        {result && (
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              Пересчитать
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
