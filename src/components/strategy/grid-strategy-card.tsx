"use client"

import { MoreHorizontal, Trash2, StopCircle, TrendingUp, TrendingDown } from "lucide-react"

import type { GridConfig } from "@/core/types/grid"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { formatPrice } from "@/lib/terminal-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function isGridConfig(config: unknown): config is GridConfig {
  return typeof config === "object" && config !== null && (config as GridConfig).type === "GRID"
}

type GridStats = {
  totalBuys: number
  totalSells: number
  realizedPnl: number
}

type GridStrategyCardProps = {
  strategy: StrategyRow
  gridStats?: GridStats
  onStop: (id: string) => void
  onDelete: (id: string) => void
}

const STATUS_MAP: Record<string, { style: string; label: string }> = {
  ACTIVE: { style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Активна" },
  DRAFT: { style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Черновик" },
  PAUSED: { style: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Пауза" },
  TRIGGERED: { style: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Сработала" },
}

const DISTRIBUTION_LABELS: Record<string, string> = {
  ARITHMETIC: "Арифметическое",
  GEOMETRIC: "Геометрическое",
}

export const GridStrategyCard = ({ strategy, gridStats, onStop, onDelete }: GridStrategyCardProps) => {
  if (!isGridConfig(strategy.config)) return null

  const config = strategy.config
  const isActive = strategy.status === "ACTIVE"
  const pnl = gridStats?.realizedPnl ?? 0
  const pnlPositive = pnl >= 0

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-3 sm:p-4 transition-colors hover:border-primary/30">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h3 className="truncate text-sm font-semibold">{strategy.name}</h3>
            <Badge variant="outline" className={`text-[10px] sm:text-xs ${STATUS_MAP[strategy.status]?.style}`}>
              {STATUS_MAP[strategy.status]?.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
              Grid Bot
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{strategy.instrument}</span>
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
            {isActive && (
              <DropdownMenuItem onClick={() => onStop(strategy.id)} className="text-yellow-400">
                <StopCircle className="mr-2 h-3.5 w-3.5" />
                Остановить
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDelete(strategy.id)} className="text-red-400">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Диапазон:</span>
          <span className="font-mono text-foreground">
            {formatPrice(config.lowerPrice)} — {formatPrice(config.upperPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Уровней:</span>
          <span className="font-mono text-foreground">{config.gridLevels}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Распределение:</span>
          <span className="text-foreground">{DISTRIBUTION_LABELS[config.gridDistribution] ?? config.gridDistribution}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Комиссия:</span>
          <span className="font-mono text-foreground">{(config.feeRate * 100).toFixed(2)}%</span>
        </div>
        {config.stopLoss && (
          <div className="flex items-center justify-between">
            <span>SL:</span>
            <span className="font-mono text-red-400">{formatPrice(config.stopLoss)}</span>
          </div>
        )}
        {config.takeProfit && (
          <div className="flex items-center justify-between">
            <span>TP:</span>
            <span className="font-mono text-emerald-400">{formatPrice(config.takeProfit)}</span>
          </div>
        )}
      </div>

      {gridStats && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {gridStats.totalBuys} BUY / {gridStats.totalSells} SELL
          </span>
          <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono ${pnlPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {pnlPositive
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            P&L: {pnlPositive ? "+" : ""}{pnl.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}
