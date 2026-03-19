"use client"

import { MoreHorizontal, Pencil, Trash2, Play, Pause, Radio } from "lucide-react"

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
  onStatusChange: (id: string, status: string) => void
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DRAFT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  PAUSED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  TRIGGERED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активна",
  DRAFT: "Черновик",
  PAUSED: "Пауза",
  TRIGGERED: "Сработала",
}

const CONDITION_LABELS_RU: Record<string, string> = {
  GREATER_THAN: "Больше чем",
  LESS_THAN: "Меньше чем",
  CROSSES_ABOVE: "Пересекает вверх",
  CROSSES_BELOW: "Пересекает вниз",
  EQUALS: "Равно",
  ABOVE_BY_PERCENT: "Выше на %",
  BELOW_BY_PERCENT: "Ниже на %",
  MULTIPLIED_BY: "Кратно",
  BETWEEN: "Между",
}

const LOGIC_LABELS: Record<string, string> = { AND: "И", OR: "ИЛИ" }

const getConditionSummary = (condition: StrategyCondition) => {
  const indicator = INDICATORS.find((i) => i.type === condition.indicator)
  const label = indicator?.label ?? condition.indicator
  const paramStr = Object.values(condition.params).join(",")
  const indicatorDisplay = paramStr ? `${label}(${paramStr})` : label
  const conditionLabel = CONDITION_LABELS_RU[condition.condition] ?? condition.condition
  return `${indicatorDisplay} ${conditionLabel}${condition.value !== undefined ? ` ${condition.value}` : ""}`
}

const getConditionsDisplay = (conditions: StrategyCondition | StrategyCondition[], logic?: string) => {
  const arr = Array.isArray(conditions) ? conditions : [conditions]
  const separator = ` ${LOGIC_LABELS[logic ?? "AND"] ?? logic} `
  return arr.map(getConditionSummary).join(separator)
}

export const StrategyCard = ({ strategy, onEdit, onDelete, onStatusChange }: StrategyCardProps) => {
  const config = strategy.config
  const isActive = strategy.status === "ACTIVE"

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
            {isActive && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                <Radio className="h-3 w-3 animate-pulse" />
                Мониторинг
              </Badge>
            )}
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
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isActive && (
              <DropdownMenuItem onClick={() => onStatusChange(strategy.id, "ACTIVE")} className="text-emerald-400">
                <Play className="mr-2 h-3.5 w-3.5" />
                Запустить
              </DropdownMenuItem>
            )}
            {isActive && (
              <DropdownMenuItem onClick={() => onStatusChange(strategy.id, "PAUSED")} className="text-yellow-400">
                <Pause className="mr-2 h-3.5 w-3.5" />
                Остановить
              </DropdownMenuItem>
            )}
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
          {getConditionsDisplay(config.entry, config.entryLogic)}
        </p>
        <p>
          <span className="text-red-400">Выход:</span>{" "}
          {getConditionsDisplay(config.exit, config.exitLogic)}
        </p>
      </div>

      {(config.risks.stopLoss || config.risks.takeProfit) && (
        <div className="mt-3 flex gap-2">
          {config.risks.stopLoss && (
            <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
              SL: {config.risks.stopLoss}%
            </span>
          )}
          {config.risks.takeProfit && (
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              TP: {config.risks.takeProfit}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
