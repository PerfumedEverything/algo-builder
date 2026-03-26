"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { AssetTypeBreakdown } from "@/core/types"

type AssetTypeChartProps = {
  data: AssetTypeBreakdown[]
  loading: boolean
}

const TYPE_COLORS: Record<string, string> = {
  stock: "#3b82f6",
  etf: "#8b5cf6",
  bond: "#10b981",
  currency: "#f59e0b",
  futures: "#ef4444",
}

const getColor = (type: string) => TYPE_COLORS[type.toLowerCase()] ?? "#94a3b8"

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value)

export const AssetTypeChart = ({ data, loading }: AssetTypeChartProps) => {
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
        <p className="text-sm text-muted-foreground">Нет данных по типам активов</p>
      </div>
    )
  }

  const chartData = data.map(d => ({
    name: d.label,
    value: d.value,
    count: d.count,
    percent: d.percent,
    type: d.type,
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Типы активов</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={70}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, _name, props) => [
              `${formatRub(value as number)} (${(props.payload as { count: number; percent: number }).count} шт, ${(props.payload as { count: number; percent: number }).percent.toFixed(1)}%)`,
              "Стоимость",
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={getColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
