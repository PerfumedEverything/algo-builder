"use client"

import type { IndicatorType, ConditionType, StrategyCondition } from "@/core/types"
import { INDICATORS, getIndicatorConfig } from "@/core/config/indicators"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStrategyStore } from "@/hooks/use-strategy-store"

const CONDITIONS: { value: ConditionType; label: string }[] = [
  { value: "CROSSES_ABOVE", label: "Пересекает вверх" },
  { value: "CROSSES_BELOW", label: "Пересекает вниз" },
  { value: "GREATER_THAN", label: "Больше чем" },
  { value: "LESS_THAN", label: "Меньше чем" },
  { value: "EQUALS", label: "Равно" },
  { value: "BETWEEN", label: "Между" },
]

type ConditionBuilderProps = {
  type: "entry" | "exit"
}

export const ConditionBuilder = ({ type }: ConditionBuilderProps) => {
  const { config, setEntry, setExit } = useStrategyStore()
  const condition = config[type]
  const setter = type === "entry" ? setEntry : setExit

  const indicatorConfig = getIndicatorConfig(condition.indicator)

  const updateField = (field: Partial<StrategyCondition>) => {
    setter({ ...condition, ...field })
  }

  const handleIndicatorChange = (value: string) => {
    const newIndicator = value as IndicatorType
    const newConfig = getIndicatorConfig(newIndicator)
    const params: Record<string, number> = {}
    newConfig?.params.forEach((p) => {
      params[p.name] = p.defaultValue
    })
    setter({
      indicator: newIndicator,
      params,
      condition: condition.condition,
      value: condition.value,
    })
  }

  const handleParamChange = (name: string, value: number) => {
    updateField({ params: { ...condition.params, [name]: value } })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Индикатор</Label>
          <Select value={condition.indicator} onValueChange={handleIndicatorChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDICATORS.map((ind) => (
                <SelectItem key={ind.type} value={ind.type}>
                  {ind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Условие</Label>
          <Select
            value={condition.condition}
            onValueChange={(v) => updateField({ condition: v as ConditionType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {indicatorConfig && indicatorConfig.params.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {indicatorConfig.params.map((p) => (
            <div key={p.name} className="space-y-2">
              <Label className="text-xs text-muted-foreground">{p.label}</Label>
              <Input
                type="number"
                value={condition.params[p.name] ?? p.defaultValue}
                onChange={(e) => handleParamChange(p.name, Number(e.target.value))}
                min={p.min}
                max={p.max}
              />
            </div>
          ))}
        </div>
      )}

      <div className="w-1/2 space-y-2 sm:w-1/3">
        <Label className="text-xs text-muted-foreground">Значение</Label>
        <Input
          type="number"
          value={condition.value ?? ""}
          onChange={(e) =>
            updateField({ value: e.target.value ? Number(e.target.value) : undefined })
          }
          placeholder="Опционально"
        />
      </div>
    </div>
  )
}
