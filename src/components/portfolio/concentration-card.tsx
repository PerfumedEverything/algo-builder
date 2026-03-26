"use client"

import { AlertTriangle, Shield, ShieldAlert } from "lucide-react"
import type { ConcentrationIndex } from "@/core/types"

type ConcentrationCardProps = {
  data: ConcentrationIndex
  loading: boolean
}

const LEVEL_CONFIG = {
  diversified: { label: "Диверсифицирован", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Shield },
  moderate: { label: "Умеренная концентрация", color: "text-amber-500", bg: "bg-amber-500/10", icon: ShieldAlert },
  concentrated: { label: "Высокая концентрация", color: "text-red-500", bg: "bg-red-500/10", icon: AlertTriangle },
}

export const ConcentrationCard = ({ data, loading }: ConcentrationCardProps) => {
  if (loading) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  const config = LEVEL_CONFIG[data.level]
  const Icon = config.icon

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Концентрация портфеля</h3>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bg}`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div>
          <p className="text-lg font-bold">{(data.hhi * 100).toFixed(1)}%</p>
          <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
        </div>
      </div>
      {data.dominantPositions.length > 0 && (
        <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2">
          <p className="text-xs text-red-500">
            Доминирует: {data.dominantPositions.map(p => `${p.ticker} (${(p.weight * 100).toFixed(1)}%)`).join(", ")}
          </p>
        </div>
      )}
    </div>
  )
}
