"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { TradeSuccessBreakdown } from "@/core/types"

type TradeSuccessChartProps = {
  data: TradeSuccessBreakdown
  loading: boolean
}

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value)

export const TradeSuccessChart = ({ data, loading }: TradeSuccessChartProps) => {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  const { profitable, unprofitable, breakEven } = data
  const total = profitable.count + unprofitable.count + breakEven.count

  if (!total) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Нет закрытых стратегий</p>
      </div>
    )
  }

  const chartData = [
    { name: "Прибыльные", value: profitable.count, color: "#10b981" },
    { name: "Убыточные", value: unprofitable.count, color: "#ef4444" },
    ...(breakEven.count > 0 ? [{ name: "Безубыточные", value: breakEven.count, color: "#94a3b8" }] : []),
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Успешность сделок</h3>
      <div className="flex gap-4">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={65}
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} шт`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3 justify-center min-w-[140px]">
          <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3">
            <TrendingUp className="mt-0.5 h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Прибыльные</p>
              <p className="text-sm font-semibold">{profitable.count} сделок</p>
              <p className="text-xs text-emerald-500 font-medium">+{formatRub(profitable.totalPnl)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3">
            <TrendingDown className="mt-0.5 h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Убыточные</p>
              <p className="text-sm font-semibold">{unprofitable.count} сделок</p>
              <p className="text-xs text-red-500 font-medium">{formatRub(unprofitable.totalPnl)}</p>
            </div>
          </div>
          {breakEven.count > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Minus className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Безубыточные</p>
                <p className="text-sm font-semibold">{breakEven.count} сделок</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
