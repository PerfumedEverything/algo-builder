"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { MarkowitzResult } from "@/core/types"

type MarkowitzComparisonProps = {
  data: MarkowitzResult | null
  loading: boolean
}

const COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#f97316",
  "#06b6d4", "#ec4899", "#64748b", "#a3e635", "#14b8a6",
  "#ef4444", "#6366f1", "#84cc16", "#d946ef", "#0ea5e9",
]

const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`

export const MarkowitzComparison = ({ data, loading }: MarkowitzComparisonProps) => {
  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!data || data.insufficientData) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">
          Недостаточно позиций для оптимизации (минимум 2 акции/ETF)
        </p>
      </div>
    )
  }

  const currentData = data.weights.map((w, i) => ({
    name: w.ticker,
    value: w.currentWeight,
    color: COLORS[i % COLORS.length],
  }))

  const optimalData = data.weights.map((w, i) => ({
    name: w.ticker,
    value: w.optimalWeight,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Оптимизация портфеля</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-center text-xs text-muted-foreground">Текущее</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={currentData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
              >
                {currentData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatPercent(value as number), "Вес"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="mb-1 text-center text-xs text-muted-foreground">Оптимальное (Марковиц)</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={optimalData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
              >
                {optimalData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatPercent(value as number), "Вес"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {data.weights.map((w, i) => (
          <div key={w.ticker} className="flex items-center gap-1 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-muted-foreground">{w.ticker}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-2 text-center text-xs">
        <div>
          <p className="text-muted-foreground">Доходность</p>
          <p className="font-medium">{formatPercent(data.expectedReturn)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Волатильность</p>
          <p className="font-medium">{formatPercent(data.expectedVolatility)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Sharpe</p>
          <p className="font-medium">{data.sharpe.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
