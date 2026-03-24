"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type ChartPeriod = "1m" | "5m" | "15m" | "1h" | "1d" | "1w"

type ChartPeriodSelectorProps = {
  value: ChartPeriod
  onChange: (period: ChartPeriod) => void
}

const PERIODS: Array<{ value: ChartPeriod; label: string; tooltip: string }> = [
  { value: "1m", label: "1м", tooltip: "1-минутные свечи" },
  { value: "5m", label: "5м", tooltip: "5-минутные свечи" },
  { value: "15m", label: "15м", tooltip: "15-минутные свечи" },
  { value: "1h", label: "1ч", tooltip: "Часовые свечи" },
  { value: "1d", label: "1д", tooltip: "Дневные свечи" },
  { value: "1w", label: "1н", tooltip: "Недельные свечи" },
]

export const ChartPeriodSelector = ({ value, onChange }: ChartPeriodSelectorProps) => (
  <div className="flex gap-1">
    {PERIODS.map((p) => (
      <Tooltip key={p.value}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onChange(p.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              value === p.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {p.label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {p.tooltip}
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
)
