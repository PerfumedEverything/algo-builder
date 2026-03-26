"use client"

import { Activity, PieChart, Shield, BarChart3 } from "lucide-react"
import type { HealthScore, HealthSubScore } from "@/core/types"

type HealthScoreCardProps = {
  data: HealthScore | null
  loading: boolean
}

const LEVEL_TEXT: Record<string, string> = {
  excellent: "Портфель в отличной форме",
  good: "Портфель в хорошей форме",
  warning: "Есть что улучшить",
  danger: "Требует внимания",
  insufficient_data: "Недостаточно позиций для анализа",
}

const scoreColor = (score: number) =>
  score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500"

const barColor = (score: number) =>
  score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"

const SUB_SCORES: { key: keyof Pick<HealthScore, "diversification" | "risk" | "performance">; label: string; icon: typeof Activity }[] = [
  { key: "diversification", label: "Диверсификация", icon: PieChart },
  { key: "risk", label: "Риск", icon: Shield },
  { key: "performance", label: "Доходность", icon: BarChart3 },
]

const SubScoreBar = ({ sub, label, icon: Icon }: { sub: HealthSubScore; label: string; icon: typeof Activity }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${scoreColor(sub.score)}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={`text-xs font-bold ${scoreColor(sub.score)}`}>{sub.score}</span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div className={`h-1.5 rounded-full ${barColor(sub.score)}`} style={{ width: `${sub.score}%` }} />
    </div>
    {sub.details.map((d, i) => (
      <p key={i} className="text-[11px] text-muted-foreground">{d}</p>
    ))}
  </div>
)

export const HealthScoreCard = ({ data, loading }: HealthScoreCardProps) => {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-xs text-muted-foreground">Нет данных</p>
      </div>
    )
  }

  if (data.level === "insufficient_data") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Здоровье портфеля</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{LEVEL_TEXT.insufficient_data}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Здоровье портфеля</h3>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${scoreColor(data.total)}`}>{data.total}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
      <p className="text-xs text-muted-foreground">{LEVEL_TEXT[data.level]}</p>
      <div className="mt-3 space-y-3">
        {SUB_SCORES.map(({ key, label, icon }) => (
          <SubScoreBar key={key} sub={data[key]} label={label} icon={icon} />
        ))}
      </div>
    </div>
  )
}
