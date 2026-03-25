"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import type { AiGeneratedStrategy } from "@/core/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AiChat } from "./ai-chat"
import { StrategyForm, type StrategyFormHandle } from "./strategy-form"
import { StrategyPreviewPanel } from "./strategy-preview-panel"

type StrategyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  strategy?: StrategyRow
  onSuccess: () => void
  initialContext?: string
  initialInstrument?: string
}

export const StrategyDialog = ({
  open,
  onOpenChange,
  strategy,
  onSuccess,
  initialContext,
  initialInstrument,
}: StrategyDialogProps) => {
  const mode = strategy ? "edit" : "create"
  const formRef = useRef<StrategyFormHandle>(null)
  const [showForm, setShowForm] = useState(false)
  const [extractedStrategy, setExtractedStrategy] = useState<AiGeneratedStrategy | null>(null)

  useEffect(() => {
    if (open) {
      setExtractedStrategy(null)
    }
  }, [open])

  const handleGenerated = (data: AiGeneratedStrategy) => {
    formRef.current?.setGeneralFields({
      name: data.name,
      instrument: initialInstrument ?? data.instrument,
      instrumentType: data.instrumentType,
      timeframe: data.timeframe,
      description: data.description,
    })
    setShowForm(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 shrink-0">
          <DialogTitle>
            {mode === "create" ? "Новая стратегия" : "Редактировать стратегию"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6 overflow-y-auto">
          {mode === "create" && !showForm && (
            <>
              <AiChat
                onGenerated={handleGenerated}
                onStrategyExtracted={setExtractedStrategy}
                initialContext={initialContext}
              />
              {extractedStrategy && <StrategyPreviewPanel strategy={extractedStrategy} />}
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                или заполнить вручную
              </button>
            </>
          )}
          {mode === "create" && showForm && (
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-180" />
              вернуться к AI помощнику
            </button>
          )}
          <div className={mode === "create" && !showForm ? "hidden" : undefined}>
            <StrategyForm
              ref={formRef}
              mode={mode}
              strategy={strategy}
              onClose={() => onOpenChange(false)}
              onSuccess={onSuccess}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
