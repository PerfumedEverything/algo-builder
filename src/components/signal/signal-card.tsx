"use client"

import { MoreHorizontal, Pencil, Trash2, Power, PowerOff, Bell } from "lucide-react"

import { INDICATORS } from "@/core/config/indicators"
import type { SignalCondition } from "@/core/types"
import type { SignalRow } from "@/server/repositories/signal-repository"
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
  onEdit: (id: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

const TYPE_STYLES: Record<string, string> = {
  BUY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SELL: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

const getConditionSummary = (condition: SignalCondition) => {
  const indicator = INDICATORS.find((i) => i.type === condition.indicator)
  const label = indicator?.label ?? condition.indicator
  const paramStr = Object.values(condition.params).join(",")
  return `${label}(${paramStr}) ${condition.condition.replace(/_/g, " ")}${condition.value !== undefined ? ` ${condition.value}` : ""}`
}

export const SignalCard = ({ signal, onEdit, onToggle, onDelete }: SignalCardProps) => {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{signal.name}</h3>
            <Badge variant="outline" className={TYPE_STYLES[signal.signalType]}>
              {signal.signalType}
            </Badge>
            {signal.isActive ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
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
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
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

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {signal.conditions.map((condition, i) => (
          <p key={i}>
            <span className="text-primary">Условие {i + 1}:</span>{" "}
            {getConditionSummary(condition)}
          </p>
        ))}
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
