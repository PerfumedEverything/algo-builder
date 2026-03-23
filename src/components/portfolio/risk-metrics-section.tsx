"use client"

import { useEffect, useState } from "react"
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  TrendingDown,
  Target,
} from "lucide-react"

import type { RiskMetrics } from "@/core/types"
import { getRiskMetricsAction } from "@/server/actions/risk-actions"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { RiskMetricCard } from "./risk-metric-card"

const METRIC_ICONS: Record<keyof Omit<RiskMetrics, "calculatedAt" | "dataPoints">, React.ReactNode> = {
  sharpe: <ShieldAlert className="h-3.5 w-3.5" />,
  beta: <Activity className="h-3.5 w-3.5" />,
  var95: <AlertTriangle className="h-3.5 w-3.5" />,
  maxDrawdown: <TrendingDown className="h-3.5 w-3.5" />,
  alpha: <Target className="h-3.5 w-3.5" />,
}

const METRIC_KEYS = ["sharpe", "beta", "var95", "maxDrawdown", "alpha"] as const

export const RiskMetricsSection = () => {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const result = await getRiskMetricsAction()
      if (result.success) {
        setMetrics(result.data)
      } else {
        setError(result.error)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        Риск-метрики
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {metrics && (
        <TooltipProvider>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {METRIC_KEYS.map((key) => (
              <RiskMetricCard
                key={key}
                metric={metrics[key]}
                icon={METRIC_ICONS[key]}
              />
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}
