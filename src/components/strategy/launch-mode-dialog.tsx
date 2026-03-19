"use client"

import { Play, TestTube, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type LaunchModeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLaunch: (mode: "test") => void
}

export const LaunchModeDialog = ({ open, onOpenChange, onLaunch }: LaunchModeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Режим запуска</DialogTitle>
          <DialogDescription>Выберите режим работы стратегии</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onLaunch("test")}
            className="flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/30 hover:bg-accent/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <TestTube className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium">Тестовый запуск</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Мониторинг рынка + уведомления в Telegram. Без реальных сделок.
              </p>
            </div>
          </button>

          <div className="relative flex w-full items-center gap-4 rounded-lg border border-border p-4 opacity-50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">Реальная торговля</p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Lock className="mr-1 h-3 w-3" />
                  Скоро
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Автоматическое открытие/закрытие позиций через брокера.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
