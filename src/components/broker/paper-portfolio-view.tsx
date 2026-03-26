"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, TrendingUp, TrendingDown, FlaskConical } from "lucide-react"

import type { PaperStrategyRow } from "@/server/actions/operation-actions"
import { getPaperPortfolioAction } from "@/server/actions/operation-actions"

const formatMoney = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const formatPercent = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`

const formatSignedMoney = (n: number) =>
  `${n >= 0 ? "+" : ""}${formatMoney(n)}`

const yieldColor = (n: number) =>
  n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-muted-foreground"

export const PaperPortfolioView = () => {
  const [rows, setRows] = useState<PaperStrategyRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPaperPortfolioAction()
      if (res.success) setRows(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FlaskConical className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Нет стратегий с операциями
        </p>
      </div>
    )
  }

  const totalPnl = rows.reduce((s, r) => s + r.stats.pnl, 0)
  const totalInitial = rows.reduce((s, r) => s + r.stats.initialAmount, 0)
  const totalPnlPct = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0
  const activeCount = rows.filter((r) => r.hasOpenPosition).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Общий P&L</p>
          <p className={`text-xl font-bold ${yieldColor(totalPnl)}`}>
            {formatSignedMoney(totalPnl)}
          </p>
          <p className={`text-xs ${yieldColor(totalPnlPct)}`}>{formatPercent(totalPnlPct)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Стратегий</p>
          <p className="text-xl font-bold">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Открытых позиций</p>
          <p className="text-xl font-bold">{activeCount}</p>
        </div>
      </div>

      <div className="max-w-full overflow-hidden rounded-xl border border-border bg-card p-4">
        <div className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
          <div className="min-w-[600px]">
            <div className="grid grid-cols-7 gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
              <span className="col-span-2">Стратегия</span>
              <span>Инструмент</span>
              <span className="text-right">Операций</span>
              <span className="text-right">P&L ₽</span>
              <span className="text-right">P&L %</span>
              <span className="text-right">Статус</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.strategyId}
                className="grid grid-cols-7 gap-2 border-b border-border/50 py-2.5 text-sm last:border-0"
              >
                <span className="col-span-2 truncate font-medium">{row.strategyName}</span>
                <span className="text-muted-foreground">{row.instrument}</span>
                <div className="text-right tabular-nums">
                  <span>{row.stats.totalOperations}</span>
                  {(row.profitableOps > 0 || row.unprofitableOps > 0) && (
                    <span className="ml-1 text-xs">
                      (<span className="text-emerald-400">{row.profitableOps}</span>
                      /
                      <span className="text-red-400">{row.unprofitableOps}</span>)
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {row.stats.pnl >= 0
                    ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                    : <TrendingDown className="h-3 w-3 text-red-400" />}
                  <span className={`tabular-nums font-medium ${yieldColor(row.stats.pnl)}`}>
                    {formatSignedMoney(row.stats.pnl)}
                  </span>
                </div>
                <span className={`text-right tabular-nums font-medium ${yieldColor(row.stats.pnlPercent)}`}>
                  {formatPercent(row.stats.pnlPercent)}
                </span>
                <span className="text-right">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                    row.hasOpenPosition
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {row.hasOpenPosition ? "Открыта" : "Закрыта"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
