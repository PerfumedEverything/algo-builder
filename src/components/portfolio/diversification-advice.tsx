"use client"

import { Check, AlertTriangle, XCircle, ListChecks } from "lucide-react"
import type { DiversificationAdvice } from "@/core/types"

type DiversificationAdviceListProps = {
  advice: DiversificationAdvice[]
  loading: boolean
}

const ICON_MAP = {
  check: { icon: Check, color: "text-emerald-500" },
  "alert-triangle": { icon: AlertTriangle, color: "text-amber-500" },
  "x-circle": { icon: XCircle, color: "text-red-500" },
}

export const DiversificationAdviceList = ({ advice, loading }: DiversificationAdviceListProps) => {
  if (loading) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (advice.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Рекомендации по диверсификации</h3>
      </div>
      <div className="mt-3 space-y-2">
        {advice.map((item, i) => {
          const config = ICON_MAP[item.icon]
          const Icon = config.icon
          return (
            <div key={i} className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
              <p className="text-xs">{item.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
