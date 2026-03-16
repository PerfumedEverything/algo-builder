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
}

export const SignalDialog = ({
  open,
  onOpenChange,
  signal,
  onSuccess,
}: SignalDialogProps) => {
  const mode = signal ? "edit" : "create"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {mode === "create" ? "Новый сигнал" : "Редактировать сигнал"}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <SignalForm
            mode={mode}
            signal={signal}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
