"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Play, Pause, Radio, ChevronDown, Activity, TrendingUp, TrendingDown } from "lucide-react"

import type { OperationStats, StrategyOperation } from "@/core/types"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import { formatPrice } from "@/lib/terminal-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { getOperationsAction } from "@/server/actions/operation-actions"
import { StrategyCardConditions } from "./strategy-card-conditions"
import { StrategyCardOps } from "./strategy-card-ops"

type StrategyCardProps = {
  strategy: StrategyRow
  operationStats?: OperationStats
  lastBuyPrice?: number
  currentPrice?: number
  expanded?: boolean
  onToggleExpand?: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  brokerType?: string
}

const STATUS_MAP: Record<string, { style: string; label: string }> = {
  ACTIVE: { style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Активна" },
  DRAFT: { style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Черновик" },
  PAUSED: { style: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Пауза" },
  TRIGGERED: { style: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Сработала" },
}
const formatAmount = (n: number) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const StrategyCard = ({ strategy, operationStats, lastBuyPrice, currentPrice, expanded: controlledExpanded, onToggleExpand, onEdit, onDelete, onStatusChange, brokerType }: StrategyCardProps) => {
  const config = strategy.config
  const isActive = strategy.status === "ACTIVE"
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = controlledExpanded ?? internalExpanded
  const [operations, setOperations] = useState<StrategyOperation[]>([])
  const [opsLoading, setOpsLoading] = useState(false)
  const stats = operationStats
  const hasOps = stats && stats.totalOperations > 0
  const handleToggleOps = async () => {
    if (expanded) {
      onToggleExpand ? onToggleExpand() : setInternalExpanded(false)
      return
    }
    setOpsLoading(true)
    const res = await getOperationsAction(strategy.id)
    if (res.success) setOperations(res.data)
    else { toast.error("Не удалось загрузить операции"); setOperations([]) }
    setOpsLoading(false)
    onToggleExpand ? onToggleExpand() : setInternalExpanded(true)
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-3 sm:p-4 transition-colors hover:border-primary/30">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h3 className="truncate text-sm font-semibold">{strategy.name}</h3>
            <Badge variant="outline" className={`text-[10px] sm:text-xs ${STATUS_MAP[strategy.status]?.style}`}>{STATUS_MAP[strategy.status]?.label}</Badge>
            {isActive && strategy.positionState === "OPEN" && (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                <Radio className="h-3 w-3 animate-pulse" />Позиция открыта
              </Badge>
            )}
            {isActive && strategy.positionState !== "OPEN" && (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-zinc-500/10 text-zinc-400 border-zinc-500/20 gap-1">
                <Radio className="h-3 w-3" />Ожидает вход
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{strategy.instrument}</span>
            <span>·</span><span>{strategy.timeframe}</span>
            <span>·</span><span>{strategy.instrumentType}</span>
            {currentPrice && currentPrice > 0 && (
              <><span>·</span><span className="font-mono text-foreground">Курс: {formatPrice(currentPrice, brokerType)} ₽</span></>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isActive && <DropdownMenuItem onClick={() => onStatusChange(strategy.id, "ACTIVE")} className="text-emerald-400"><Play className="mr-2 h-3.5 w-3.5" />Запустить</DropdownMenuItem>}
            {isActive && <DropdownMenuItem onClick={() => onStatusChange(strategy.id, "PAUSED")} className="text-yellow-400"><Pause className="mr-2 h-3.5 w-3.5" />Остановить</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => onEdit(strategy.id)}><Pencil className="mr-2 h-3.5 w-3.5" />Редактировать</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(strategy.id)} className="text-red-400"><Trash2 className="mr-2 h-3.5 w-3.5" />Удалить</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground break-words">
        <StrategyCardConditions conditions={config.entry} logic={config.entryLogic} type="entry" /><StrategyCardConditions conditions={config.exit} logic={config.exitLogic} type="exit" />
      </div>

      {isActive && strategy.positionState === "OPEN" && lastBuyPrice && lastBuyPrice > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Цена входа:</span><span className="font-mono text-emerald-400">{formatPrice(lastBuyPrice, brokerType)} ₽</span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {config.risks.stopLoss && <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">SL: {config.risks.stopLoss}%</span>}
        {config.risks.takeProfit && <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">TP: {config.risks.takeProfit}%</span>}
      </div>

      {hasOps && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
            <Activity className="h-3 w-3" />
            {stats.totalOperations} {stats.totalOperations === 1 ? "операция" : stats.totalOperations < 5 ? "операции" : "операций"}
          </span>
          {stats.holdingQty === 0 ? (
            <span className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono">
              <span className="text-muted-foreground">Результат:</span>
              {stats.pnl >= 0 ? <><TrendingUp className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">+{formatAmount(stats.pnl)} ₽</span></> : <><TrendingDown className="h-3 w-3 text-red-400" /><span className="text-red-400">{formatAmount(stats.pnl)} ₽</span></>}
              <span className={stats.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}>({stats.pnlPercent >= 0 ? "+" : ""}{stats.pnlPercent.toFixed(2)}%)</span>
            </span>
          ) : (
            <>
              <span className="text-xs font-mono text-muted-foreground">Позиция: <span className="text-foreground">{formatAmount(stats.currentAmount > 0 ? stats.currentAmount : stats.initialAmount)} ₽</span></span>
              <span className={`rounded px-2 py-0.5 text-xs font-mono ${stats.pnlPercent >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {stats.pnl >= 0 ? "+" : ""}{formatAmount(stats.pnl)} ₽ ({stats.pnlPercent >= 0 ? "+" : ""}{stats.pnlPercent.toFixed(2)}%)
              </span>
            </>
          )}
          <button type="button" onClick={handleToggleOps} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Операции<ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {expanded && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border bg-background/50">
          <StrategyCardOps operations={operations} loading={opsLoading} />
        </div>
      )}
    </div>
  )
}
