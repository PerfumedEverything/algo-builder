"use client"

import type { RiskMetricResult } from "@/core/types"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

type RiskMetricCardProps = {
  metric: RiskMetricResult
  icon: React.ReactNode
}

const statusColor: Record<string, string> = {
  green: "text-emerald-400",
  yellow: "text-yellow-400",
  red: "text-red-400",
}

const formatValue = (value: number, format: RiskMetricResult["format"]): string => {
  if (format === "percent") return `${(value * 100).toFixed(2)}%`
  return value.toFixed(2)
}

export const RiskMetricCard = ({ metric, icon }: RiskMetricCardProps) => {
  const hasValue = metric.value !== null
  const colorClass = hasValue && metric.status
    ? statusColor[metric.status] ?? "text-muted-foreground"
    : "text-muted-foreground"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            {icon}
            {metric.label}
          </div>
          <p className={`text-xl font-bold ${colorClass}`}>
            {hasValue ? formatValue(metric.value!, metric.format) : "\u2014"}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        {hasValue ? metric.tooltip : "Недостаточно данных"}
      </TooltipContent>
    </Tooltip>
  )
}
