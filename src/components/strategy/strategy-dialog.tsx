"use client"

import { useRef } from "react"
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

type StrategyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  strategy?: StrategyRow
  onSuccess: () => void
}

export const StrategyDialog = ({
  open,
  onOpenChange,
  strategy,
  onSuccess,
}: StrategyDialogProps) => {
  const mode = strategy ? "edit" : "create"
  const formRef = useRef<StrategyFormHandle>(null)

  const handleGenerated = (data: AiGeneratedStrategy) => {
    formRef.current?.setGeneralFields({
      name: data.name,
      instrument: data.instrument,
      instrumentType: data.instrumentType,
      timeframe: data.timeframe,
      description: data.description,
    })
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
          {mode === "create" && <AiChat onGenerated={handleGenerated} />}
          <StrategyForm
            ref={formRef}
            mode={mode}
            strategy={strategy}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
