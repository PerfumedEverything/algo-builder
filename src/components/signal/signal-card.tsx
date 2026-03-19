"use client"

import { MoreHorizontal, Pencil, Trash2, Power, PowerOff, Bell, Repeat } from "lucide-react"

import { INDICATORS } from "@/core/config/indicators"
import type { SignalCondition } from "@/core/types"
import type { SignalRow } from "@/server/repositories/signal-repository"
import type { ConditionProgress } from "@/server/actions/signal-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type SignalCardProps = {
  signal: SignalRow
  progress?: ConditionProgress[]
  onEdit: (id: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

const TYPE_STYLES: Record<string, string> = {
  BUY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SELL: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  ALERT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
}

const TYPE_LABELS: Record<string, string> = {
  BUY: "BUY",
  SELL: "SELL",
  ALERT: "Алерт",
}

const CONDITION_LABELS: Record<string, string> = {
  GREATER_THAN: ">",
  LESS_THAN: "<",
  CROSSES_ABOVE: "↗",
  CROSSES_BELOW: "↘",
  EQUALS: "=",
  ABOVE_BY_PERCENT: ">%",
  BELOW_BY_PERCENT: "<%",
  MULTIPLIED_BY: "×",
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

const getConditionSummary = (condition: SignalCondition) => {
  const indicator = INDICATORS.find((i) => i.type === condition.indicator)
  const label = indicator?.label ?? condition.indicator
  const paramStr = Object.values(condition.params).join(",")
  const indicatorDisplay = paramStr ? `${label}(${paramStr})` : label
  const conditionLabel = CONDITION_LABELS_RU[condition.condition] ?? condition.condition
  return `${indicatorDisplay} ${conditionLabel}${condition.value !== undefined ? ` ${condition.value}` : ""}`
}

const getProgressPercent = (p: ConditionProgress): number => {
  if (p.met) return 100
  if (p.target === 0) return 0

  const cond = p.condition
  if (cond === "GREATER_THAN" || cond === "CROSSES_ABOVE") {
    if (p.current >= p.target) return 100
    if (p.current <= 0 && p.target > 0) return 0
    return Math.min(99, Math.max(0, (p.current / p.target) * 100))
  }
  if (cond === "LESS_THAN" || cond === "CROSSES_BELOW") {
    if (p.current <= p.target) return 100
    if (p.target <= 0) return 0
    const ratio = p.target / p.current
    return Math.min(99, Math.max(0, ratio * 100))
  }
  return p.met ? 100 : 50
}

export const SignalCard = ({ signal, progress, onEdit, onToggle, onDelete }: SignalCardProps) => {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{signal.name}</h3>
            <Badge variant="outline" className={TYPE_STYLES[signal.signalType]}>
              {TYPE_LABELS[signal.signalType] ?? signal.signalType}
            </Badge>
            {signal.repeatMode && (
              <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px] px-1.5 py-0 gap-0.5">
                <Repeat className="h-2.5 w-2.5" />
                Постоянный
              </Badge>
            )}
            {signal.isActive ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            ) : signal.triggerCount > 0 ? (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0">
                Сработал
              </Badge>
            ) : (
              <span className="flex h-2 w-2 rounded-full bg-zinc-500" />
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{signal.instrument}</span>
            <span>·</span>
            <span>{signal.timeframe}</span>
            <span>·</span>
            <span>{signal.instrumentType}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggle(signal.id)}>
              {signal.isActive ? (
                <><PowerOff className="mr-2 h-3.5 w-3.5" />Отключить</>
              ) : (
                <><Power className="mr-2 h-3.5 w-3.5" />Включить</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(signal.id)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(signal.id)} className="text-red-400">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 space-y-2">
        {signal.conditions.map((condition, i) => {
          const p = progress?.[i]
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <span className="text-primary">Условие {i + 1}:</span>{" "}
                  {getConditionSummary(condition)}
                </span>
                {p && (
                  <span className={`font-mono ${p.met ? "text-emerald-400" : "text-foreground"}`}>
                    {p.current} {CONDITION_LABELS[p.condition] ?? ""} {p.target}
                  </span>
                )}
              </div>
              {p && signal.isActive && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      p.met ? "bg-emerald-400" : getProgressPercent(p) > 80 ? "bg-yellow-400" : "bg-primary/50"
                    }`}
                    style={{ width: `${getProgressPercent(p)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Bell className="h-3 w-3" />
          {signal.channels.join(", ")}
        </div>
        {signal.triggerCount > 0 && (
          <span>Сработал: {signal.triggerCount} раз</span>
        )}
        {signal.lastTriggered && (
          <span>Последний: {new Date(signal.lastTriggered).toLocaleDateString("ru")}</span>
        )}
      </div>
    </div>
  )
}
