"use client"

import type { SignalRow } from "@/server/repositories/signal-repository"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SignalForm } from "./signal-form"

type SignalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  signal?: SignalRow
  onSuccess: () => void
  initialContext?: string
  initialInstrument?: string
}

export const SignalDialog = ({
  open,
  onOpenChange,
  signal,
  onSuccess,
  initialContext,
  initialInstrument,
}: SignalDialogProps) => {
  const mode = signal ? "edit" : "create"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 shrink-0">
          <DialogTitle>
            {mode === "create" ? "Новый сигнал" : "Редактировать сигнал"}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-y-auto">
          {initialContext && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm mb-4">
              <p className="font-medium mb-1">Контекст из анализа:</p>
              <p className="text-muted-foreground line-clamp-4">{initialContext}</p>
            </div>
          )}
          <SignalForm
            mode={mode}
            signal={signal}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
            initialInstrument={initialInstrument}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
