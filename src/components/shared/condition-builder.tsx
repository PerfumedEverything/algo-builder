"use client"

import { useEffect, useRef } from "react"
import { Plus, Trash2 } from "lucide-react"

import type { IndicatorType, ConditionType, LogicOperator } from "@/core/types"
import { INDICATORS, getIndicatorConfig } from "@/core/config/indicators"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Condition = {
  indicator: IndicatorType
  params: Record<string, number>
  condition: ConditionType
  value?: number
  timeframe?: string
}

const CONDITIONS: { value: ConditionType; label: string }[] = [
  { value: "GREATER_THAN", label: "Больше чем" },
  { value: "LESS_THAN", label: "Меньше чем" },
  { value: "CROSSES_ABOVE", label: "Пересекает вверх" },
  { value: "CROSSES_BELOW", label: "Пересекает вниз" },
  { value: "ABOVE_BY_PERCENT", label: "Выше на %" },
  { value: "BELOW_BY_PERCENT", label: "Ниже на %" },
  { value: "MULTIPLIED_BY", label: "Кратно (x)" },
  { value: "EQUALS", label: "Равно" },
  { value: "BETWEEN", label: "Между" },
]

const TIMEFRAMES = [
  { value: "1m", label: "1 мин" },
  { value: "5m", label: "5 мин" },
  { value: "15m", label: "15 мин" },
  { value: "1h", label: "1 час" },
  { value: "1d", label: "1 день" },
]

const getFilteredConditions = (indicator: IndicatorType) => {
  const config = getIndicatorConfig(indicator)
  if (!config?.allowedConditions?.length) return CONDITIONS
  return CONDITIONS.filter((c) => config.allowedConditions.includes(c.value))
}

const getValueLabel = (indicator: IndicatorType, condition: ConditionType): string => {
  if (condition === "ABOVE_BY_PERCENT" || condition === "BELOW_BY_PERCENT") return "Процент (%)"
  if (condition === "MULTIPLIED_BY") return "Множитель (x)"
  switch (indicator) {
    case "PRICE": return "Цена (₽)"
    case "RSI": return "Значение (0-100)"
    default: return "Значение"
  }
}

type ConditionBuilderProps = {
  conditions: Condition[]
  logicOperator: LogicOperator
  currentPrice?: number | null
  onAdd: () => void
  onUpdate: (index: number, condition: Condition) => void
  onRemove: (index: number) => void
  onLogicChange: (op: LogicOperator) => void
}

export const ConditionBuilder = ({
  conditions,
  logicOperator,
  currentPrice,
  onAdd,
  onUpdate,
  onRemove,
  onLogicChange,
}: ConditionBuilderProps) => {
  const prevPriceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!currentPrice || currentPrice === prevPriceRef.current) return
    const prevPrice = prevPriceRef.current
    prevPriceRef.current = currentPrice
    const rounded = Math.round(currentPrice * 100) / 100
    conditions.forEach((c, i) => {
      if (c.indicator !== "PRICE") return
      const isPercent = c.condition === "ABOVE_BY_PERCENT" || c.condition === "BELOW_BY_PERCENT"
      if (isPercent) return
      const noValue = c.value === undefined || c.value === 0
      const matchesPrev = prevPrice !== null && c.value !== undefined && Math.abs(c.value - prevPrice) / prevPrice < 0.01
      if (noValue || matchesPrev) {
        onUpdate(i, { ...c, value: rounded })
      }
    })
  }, [currentPrice])

  const handleIndicatorChange = (index: number, value: string) => {
    const newIndicator = value as IndicatorType
    const config = getIndicatorConfig(newIndicator)
    const params: Record<string, number> = {}
    config?.params.forEach((p) => {
      params[p.name] = p.defaultValue
    })
    const allowed = config?.allowedConditions ?? []
    const currentCondition = conditions[index].condition
    const newCondition = allowed.includes(currentCondition) ? currentCondition : allowed[0] ?? "GREATER_THAN"
    const isPercentCondition = newCondition === "ABOVE_BY_PERCENT" || newCondition === "BELOW_BY_PERCENT"
    const prevIndicator = conditions[index].indicator
    const switchedFromPrice = prevIndicator === "PRICE" && newIndicator !== "PRICE"
    const defaultValue = newIndicator === "PRICE" && currentPrice && !isPercentCondition
      ? Math.round(currentPrice * 100) / 100
      : isPercentCondition || switchedFromPrice ? undefined : conditions[index].value
    onUpdate(index, {
      indicator: newIndicator,
      params,
      condition: newCondition,
      value: defaultValue,
      timeframe: conditions[index].timeframe,
    })
  }

  const handleFieldChange = (index: number, field: Partial<Condition>) => {
    onUpdate(index, { ...conditions[index], ...field })
  }

  const handleParamChange = (index: number, name: string, value: number) => {
    handleFieldChange(index, {
      params: { ...conditions[index].params, [name]: value },
    })
  }

  return (
    <div className="space-y-3">
      {conditions.map((condition, i) => {
        const indicatorConfig = getIndicatorConfig(condition.indicator)

        return (
          <div key={i}>
            {i > 0 && (
              <div className="flex items-center justify-center py-2 gap-2">
                <div className="h-px flex-1 bg-border" />
                <Select
                  value={logicOperator}
                  onValueChange={(v) => onLogicChange(v as LogicOperator)}
                >
                  <SelectTrigger className="w-24 h-7 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">И (оба)</SelectItem>
                    <SelectItem value="OR">ИЛИ (любое)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Условие {i + 1}
                </span>
                {conditions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemove(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                )}
              </div>

              {indicatorConfig && indicatorConfig.description && (
                <p className="text-xs text-muted-foreground/70 -mt-1">{indicatorConfig.description}</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Индикатор</Label>
                  <Select
                    value={condition.indicator}
                    onValueChange={(v) => handleIndicatorChange(i, v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INDICATORS.map((ind) => (
                        <SelectItem key={ind.type} value={ind.type}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Условие</Label>
                  <Select
                    value={condition.condition}
                    onValueChange={(v) =>
                      handleFieldChange(i, { condition: v as ConditionType })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {getFilteredConditions(condition.indicator).map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {indicatorConfig && indicatorConfig.params.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {indicatorConfig.params.map((p) => (
                    <div key={p.name} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{p.label} ({p.min}–{p.max})</Label>
                      <Input
                        type="number"
                        step="any"
                        value={condition.params[p.name] ?? p.defaultValue}
                        onChange={(e) =>
                          handleParamChange(i, p.name, Number(e.target.value))
                        }
                        min={p.min}
                        max={p.max}
                        placeholder={`По умолчанию: ${p.defaultValue}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {getValueLabel(condition.indicator, condition.condition)}
                  </Label>
                  <Input
                    type="number"
                    value={condition.value ?? ""}
                    onChange={(e) =>
                      handleFieldChange(i, {
                        value: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder={
                      condition.indicator === "PRICE" && currentPrice &&
                      condition.condition !== "ABOVE_BY_PERCENT" && condition.condition !== "BELOW_BY_PERCENT"
                        ? `Текущий: ${Math.round(currentPrice * 100) / 100}`
                        : condition.condition === "ABOVE_BY_PERCENT" || condition.condition === "BELOW_BY_PERCENT"
                          ? "Например: 5"
                          : condition.condition === "MULTIPLIED_BY"
                            ? "Например: 2"
                            : "Целевое значение"
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Таймфрейм условия</Label>
                  <Select
                    value={condition.timeframe ?? ""}
                    onValueChange={(v) => handleFieldChange(i, { timeframe: v || undefined })}
                  >
                    <SelectTrigger><SelectValue placeholder="Как у стратегии" /></SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" onClick={() => {
        onAdd()
        if (currentPrice) {
          setTimeout(() => {
            const newIndex = conditions.length
            onUpdate(newIndex, {
              indicator: "PRICE",
              params: {},
              condition: "GREATER_THAN",
              value: Math.round(currentPrice * 100) / 100,
            })
          }, 0)
        }
      }} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Добавить условие
      </Button>
    </div>
  )
}
