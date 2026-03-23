"use client"

import { cn } from "@/lib/utils"

export type ChartPeriod = "1d" | "1w" | "1m" | "3m" | "1y"

type ChartPeriodSelectorProps = {
  value: ChartPeriod
  onChange: (period: ChartPeriod) => void
}

const PERIODS: Array<{ value: ChartPeriod; label: string }> = [
  { value: "1d", label: "1Д" },
  { value: "1w", label: "1Н" },
  { value: "1m", label: "1М" },
  { value: "3m", label: "3М" },
  { value: "1y", label: "1Г" },
]

export const ChartPeriodSelector = ({ value, onChange }: ChartPeriodSelectorProps) => (
  <div className="flex gap-1">
    {PERIODS.map((p) => (
      <button
        key={p.value}
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
    ))}
  </div>
)
