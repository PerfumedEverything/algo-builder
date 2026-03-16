"use client"

import type { StrategyRow } from "@/server/repositories/strategy-repository"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AiGenerator } from "./ai-generator"
import { StrategyForm } from "./strategy-form"

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {mode === "create" ? "Новая стратегия" : "Редактировать стратегию"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          {mode === "create" && <AiGenerator />}
          <StrategyForm
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
