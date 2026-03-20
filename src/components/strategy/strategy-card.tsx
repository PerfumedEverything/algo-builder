"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  Radio,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

import type { StrategyCondition, OperationStats, StrategyOperation } from "@/core/types"
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
import { getOperationsAction } from "@/server/actions/operation-actions"

type StrategyCardProps = {
  strategy: StrategyRow
  operationStats?: OperationStats
  lastBuyPrice?: number
  currentPrice?: number
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

const formatAmount = (n: number) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const StrategyCard = ({ strategy, operationStats, lastBuyPrice, currentPrice, onEdit, onDelete, onStatusChange }: StrategyCardProps) => {
  const config = strategy.config
  const isActive = strategy.status === "ACTIVE"
  const [expanded, setExpanded] = useState(false)
  const [operations, setOperations] = useState<StrategyOperation[]>([])
  const [opsLoading, setOpsLoading] = useState(false)

  const stats = operationStats
  const hasOps = stats && stats.totalOperations > 0

  const handleToggleOps = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setOpsLoading(true)
    const res = await getOperationsAction(strategy.id)
    if (res.success) setOperations(res.data)
    setOpsLoading(false)
    setExpanded(true)
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-3 sm:p-4 transition-colors hover:border-primary/30">
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h3 className="truncate text-sm font-semibold">{strategy.name}</h3>
            <Badge variant="outline" className={`text-[10px] sm:text-xs ${STATUS_STYLES[strategy.status]}`}>
              {STATUS_LABELS[strategy.status]}
            </Badge>
            {isActive && strategy.positionState === "OPEN" && (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                <Radio className="h-3 w-3 animate-pulse" />
                Позиция открыта
              </Badge>
            )}
            {isActive && strategy.positionState !== "OPEN" && (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-zinc-500/10 text-zinc-400 border-zinc-500/20 gap-1">
                <Radio className="h-3 w-3" />
                Ожидает вход
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{strategy.instrument}</span>
            <span>·</span>
            <span>{strategy.timeframe}</span>
            <span>·</span>
            <span>{strategy.instrumentType}</span>
            {currentPrice && currentPrice > 0 && (
              <>
                <span>·</span>
                <span className="font-mono text-foreground">Курс: {formatAmount(currentPrice)} ₽</span>
              </>
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

      <div className="mt-3 space-y-1 text-xs text-muted-foreground break-words">
        <p>
          <span className="text-emerald-400">Вход:</span>{" "}
          {getConditionsDisplay(config.entry, config.entryLogic)}
        </p>
        <p>
          <span className="text-red-400">Выход:</span>{" "}
          {getConditionsDisplay(config.exit, config.exitLogic)}
        </p>
      </div>

      {isActive && strategy.positionState === "OPEN" && lastBuyPrice && lastBuyPrice > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Цена входа:</span>
          <span className="font-mono text-emerald-400">{formatAmount(lastBuyPrice)} ₽</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
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

      {hasOps && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
            <Activity className="h-3 w-3" />
            {stats.totalOperations} {stats.totalOperations === 1 ? "операция" : stats.totalOperations < 5 ? "операции" : "операций"}
          </span>
          <span className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono">
            {stats.pnl >= 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">+{formatAmount(stats.pnl)} ₽</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-red-400" />
                <span className="text-red-400">{formatAmount(stats.pnl)} ₽</span>
              </>
            )}
          </span>
          <span className={`rounded px-2 py-0.5 text-xs font-mono ${
            stats.pnlPercent >= 0
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}>
            {stats.pnlPercent >= 0 ? "+" : ""}{stats.pnlPercent.toFixed(2)}%
          </span>
          {stats.initialAmount > 0 && (
            <span className={`text-xs font-mono ${
              stats.pnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {formatAmount(stats.currentAmount)} ₽
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleOps}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Операции
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {expanded && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border bg-background/50">
          {opsLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Загрузка...</div>
          ) : operations.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Нет операций</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">Тип</th>
                  <th className="px-2 py-1.5 text-right font-medium">Цена</th>
                  <th className="px-2 py-1.5 text-right font-medium">Кол-во</th>
                  <th className="px-2 py-1.5 text-right font-medium">Сумма</th>
                  <th className="px-2 py-1.5 text-right font-medium">Время</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={op.id} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-1.5">
                      <span className={`flex items-center gap-1 ${op.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                        {op.type === "BUY" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {op.type === "BUY" ? "Покупка" : "Продажа"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{formatAmount(op.price)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{op.quantity}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{formatAmount(op.amount)} ₽</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">{formatTime(op.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
