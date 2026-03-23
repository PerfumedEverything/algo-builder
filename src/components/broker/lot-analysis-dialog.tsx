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
import type { PositionOperation } from "@/core/types"
import { analyzeLotAction } from "@/server/actions/portfolio-actions"

type LotAnalysisDialogProps = {
  ticker: string
  operations: PositionOperation[]
  currentPrice: number
}

export const LotAnalysisDialog = ({ ticker, operations, currentPrice }: LotAnalysisDialogProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await analyzeLotAction(ticker, operations, currentPrice)
    if (res.success) {
      setResult(res.data!)
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
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
          <Bot className="h-3.5 w-3.5" />
          AI анализ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI анализ остатков — {ticker}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Анализирую операции...</span>
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
