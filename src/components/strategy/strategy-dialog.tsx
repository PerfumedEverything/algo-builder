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
import { AiGenerator } from "./ai-generator"
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
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {mode === "create" ? "Новая стратегия" : "Редактировать стратегию"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          {mode === "create" && <AiGenerator onGenerated={handleGenerated} />}
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
