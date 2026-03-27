"use client"

import { Loader2, TrendingUp, TrendingDown, Activity, BarChart2 } from "lucide-react"

import type { BacktestResult } from "@/server/services"

type BacktestPreviewProps = {
  result?: BacktestResult
  loading: boolean
  error?: string
}

export const BacktestPreview = ({ result, loading, error }: BacktestPreviewProps) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Запускаю бэктест на 3 месяца...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Бэктест недоступен: {error}
      </div>
    )
  }

  if (!result) return null

  const pnlPositive = result.totalPnl >= 0

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Бэктест · 3 месяца
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            Сделок
          </div>
          <p className="text-sm font-semibold">{result.totalTrades}</p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BarChart2 className="h-3 w-3" />
            Винрейт
          </div>
          <p className="text-sm font-semibold">
            {(result.winRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {pnlPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-400" />
            )}
            P&L
          </div>
          <p className={`text-sm font-semibold ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
            {result.totalPnl.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            Просадка
          </div>
          <p className="text-sm font-semibold">{result.maxDrawdown.toFixed(1)}%</p>
        </div>
      </div>
      {result.sharpeRatio !== 0 && (
        <p className="text-xs text-muted-foreground">
          Sharpe: {result.sharpeRatio.toFixed(2)}
        </p>
      )}
    </div>
  )
}
