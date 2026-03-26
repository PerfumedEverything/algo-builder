"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { BenchmarkComparison, EnhancedBenchmarkComparison } from "@/core/types"

type BenchmarkCardProps = {
  data: BenchmarkComparison | null
  enhancedData?: EnhancedBenchmarkComparison | null
  loading: boolean
}

const VERDICT_COLOR: Record<string, string> = {
  beats_market: "text-emerald-500",
  beats_deposit: "text-amber-500",
  loses_to_deposit: "text-red-500",
}

export const BenchmarkCard = ({ data, enhancedData, loading }: BenchmarkCardProps) => {
  if (loading) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-xs text-muted-foreground">Нет данных IMOEX</p>
      </div>
    )
  }

  const deltaPositive = data.delta >= 0
  const DeltaIcon = data.delta > 0 ? TrendingUp : data.delta < 0 ? TrendingDown : Minus

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Портфель vs IMOEX ({data.period}д)</h3>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Портфель</p>
          <p className={`text-lg font-bold ${data.portfolioReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {data.portfolioReturn >= 0 ? "+" : ""}{data.portfolioReturn.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">IMOEX</p>
          <p className={`text-lg font-bold ${data.benchmarkReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {data.benchmarkReturn >= 0 ? "+" : ""}{data.benchmarkReturn.toFixed(2)}%
          </p>
        </div>
        <div className="flex items-center gap-1">
          <DeltaIcon className={`h-4 w-4 ${deltaPositive ? "text-emerald-500" : "text-red-500"}`} />
          <p className={`text-sm font-semibold ${deltaPositive ? "text-emerald-500" : "text-red-500"}`}>
            {deltaPositive ? "+" : ""}{data.delta.toFixed(2)}%
          </p>
        </div>
      </div>
      {enhancedData && (
        <div className="mt-3 space-y-1 border-t border-border pt-2">
          <p className={`text-sm font-semibold ${VERDICT_COLOR[enhancedData.verdict] ?? ""}`}>
            {enhancedData.verdictText}
          </p>
          <p className="text-xs text-muted-foreground">
            vs Депозит ({(enhancedData.depositRateForPeriod * 100).toFixed(1)}%): {enhancedData.depositDelta > 0 ? "+" : ""}{enhancedData.depositDelta.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Ценовая доходность без учёта дивидендов
          </p>
        </div>
      )}
    </div>
  )
}
