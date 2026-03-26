"use client"

import { Banknote } from "lucide-react"
import type { AggregateDividendYield } from "@/core/types"

type DividendYieldCardProps = {
  data: AggregateDividendYield
  loading: boolean
}

export const DividendYieldCard = ({ data, loading }: DividendYieldCardProps) => {
  if (loading) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  const yieldColor = data.weightedYield >= 8
    ? "text-emerald-500"
    : data.weightedYield >= 4
      ? "text-amber-500"
      : "text-muted-foreground"

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Дивидендная доходность</h3>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <Banknote className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <p className={`text-lg font-bold ${yieldColor}`}>{data.weightedYield.toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground">Средневзвешенная</p>
        </div>
      </div>
    </div>
  )
}
