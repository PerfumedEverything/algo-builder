"use client"

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import type { StrategyCondition } from "@/core/types"
import { INDICATORS } from "@/core/config/indicators"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type StrategyCardProps = {
  strategy: StrategyRow
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DRAFT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  PAUSED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  ARCHIVED: "bg-red-500/10 text-red-400 border-red-500/20",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активна",
  DRAFT: "Черновик",
  PAUSED: "Пауза",
  ARCHIVED: "Архив",
}

const getConditionSummary = (condition: StrategyCondition) => {
  const indicator = INDICATORS.find((i) => i.type === condition.indicator)
  const label = indicator?.label ?? condition.indicator
  const paramStr = Object.values(condition.params).join(",")
  return `${label}(${paramStr}) ${condition.condition.replace(/_/g, " ")}${condition.value !== undefined ? ` ${condition.value}` : ""}`
}

export const StrategyCard = ({ strategy, onEdit, onDelete }: StrategyCardProps) => {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{strategy.name}</h3>
            <Badge variant="outline" className={STATUS_STYLES[strategy.status]}>
              {STATUS_LABELS[strategy.status]}
            </Badge>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{strategy.instrument}</span>
            <span>·</span>
            <span>{strategy.timeframe}</span>
            <span>·</span>
            <span>{strategy.instrumentType}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(strategy.id)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(strategy.id)} className="text-red-400">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>
          <span className="text-emerald-400">Вход:</span>{" "}
          {getConditionSummary(strategy.config.entry)}
        </p>
        <p>
          <span className="text-red-400">Выход:</span>{" "}
          {getConditionSummary(strategy.config.exit)}
        </p>
      </div>

      {(strategy.config.risks.stopLoss || strategy.config.risks.takeProfit) && (
        <div className="mt-3 flex gap-2">
          {strategy.config.risks.stopLoss && (
            <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
              SL: {strategy.config.risks.stopLoss}%
            </span>
          )}
          {strategy.config.risks.takeProfit && (
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              TP: {strategy.config.risks.takeProfit}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
