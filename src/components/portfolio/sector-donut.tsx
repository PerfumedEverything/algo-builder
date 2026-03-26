"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { SectorAllocation } from "@/core/types"

type SectorDonutProps = {
  data: SectorAllocation[]
  loading: boolean
}

const SECTOR_COLORS: Record<string, string> = {
  energy: "#f59e0b",
  finance: "#3b82f6",
  technology: "#8b5cf6",
  metals: "#64748b",
  consumer: "#10b981",
  telecom: "#06b6d4",
  transport: "#f97316",
  real_estate: "#ec4899",
  utilities: "#a3e635",
  health: "#14b8a6",
  other: "#94a3b8",
}

const getColor = (sector: string, idx: number) => {
  const key = sector.toLowerCase()
  if (SECTOR_COLORS[key]) return SECTOR_COLORS[key]
  const fallbacks = Object.values(SECTOR_COLORS)
  return fallbacks[idx % fallbacks.length]
}

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value)

export const SectorDonut = ({ data, loading }: SectorDonutProps) => {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Нет данных по секторам</p>
      </div>
    )
  }

  const chartData = data.map((d, idx) => ({
    name: d.sector,
    value: d.value,
    percent: d.percent,
    color: getColor(d.sector, idx),
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Распределение по секторам</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatRub(value as number), "Стоимость"]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            formatter={(value, entry) => {
              const payload = entry.payload as { percent?: number }
              return `${value} ${payload?.percent?.toFixed(1) ?? 0}%`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
