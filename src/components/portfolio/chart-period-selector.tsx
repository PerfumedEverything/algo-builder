"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type ChartPeriod = "1d" | "1w" | "1m" | "3m" | "1y"

type ChartPeriodSelectorProps = {
  value: ChartPeriod
  onChange: (period: ChartPeriod) => void
}

const PERIODS: Array<{ value: ChartPeriod; label: string; tooltip: string }> = [
  { value: "1d", label: "1Д", tooltip: "1 день · минутные свечи" },
  { value: "1w", label: "1Н", tooltip: "1 неделя · 15-мин свечи" },
  { value: "1m", label: "1М", tooltip: "1 месяц · часовые свечи" },
  { value: "3m", label: "3М", tooltip: "3 месяца · дневные свечи" },
  { value: "1y", label: "1Г", tooltip: "1 год · дневные свечи" },
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
