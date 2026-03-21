"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DateRange = { from: Date; to: Date }

type DateRangeFilterProps = {
  value: string
  onChange: (value: string, range: DateRange) => void
}

const PRESETS: { value: string; label: string; days: number }[] = [
  { value: "1w", label: "1 неделя", days: 7 },
  { value: "1m", label: "1 месяц", days: 30 },
  { value: "3m", label: "3 месяца", days: 90 },
  { value: "6m", label: "6 месяцев", days: 180 },
  { value: "1y", label: "1 год", days: 365 },
]

const getRange = (value: string): DateRange => {
  const preset = PRESETS.find((p) => p.value === value)
  const days = preset?.days ?? 365
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from, to }
}

export const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => (
  <Select value={value} onValueChange={(v) => onChange(v, getRange(v))}>
    <SelectTrigger className="h-8 w-[130px] text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {PRESETS.map((p) => (
        <SelectItem key={p.value} value={p.value}>
          {p.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

export { getRange }
