"use client"

import { AlertTriangle, CheckCircle2 } from "lucide-react"
import type { CorrelationWarning } from "@/core/types"

type CorrelationWarningsProps = {
  warnings: CorrelationWarning[]
  loading: boolean
}

export const CorrelationWarnings = ({ warnings, loading }: CorrelationWarningsProps) => {
  if (loading || warnings.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-500/20 bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Взаимозависимость позиций</h3>
      <div className="space-y-2">
        {warnings.map((w, i) => {
          const Icon = w.isPositive ? AlertTriangle : CheckCircle2
          const color = w.isPositive ? "text-amber-500" : "text-emerald-500"
          return (
            <div key={i} className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
              <p className="flex-1 text-xs">{w.text}</p>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                {w.corr.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
