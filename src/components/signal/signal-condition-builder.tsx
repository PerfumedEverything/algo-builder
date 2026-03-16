"use client"

import { Plus, Trash2 } from "lucide-react"

import type { IndicatorType, ConditionType, SignalCondition } from "@/core/types"
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
import { useSignalStore } from "@/hooks/use-signal-store"

const CONDITIONS: { value: ConditionType; label: string }[] = [
  { value: "CROSSES_ABOVE", label: "Пересекает вверх" },
  { value: "CROSSES_BELOW", label: "Пересекает вниз" },
  { value: "GREATER_THAN", label: "Больше чем" },
  { value: "LESS_THAN", label: "Меньше чем" },
  { value: "EQUALS", label: "Равно" },
  { value: "BETWEEN", label: "Между" },
]

export const SignalConditionBuilder = () => {
  const { conditions, addCondition, updateCondition, removeCondition } = useSignalStore()

  const handleIndicatorChange = (index: number, value: string) => {
    const newIndicator = value as IndicatorType
    const config = getIndicatorConfig(newIndicator)
    const params: Record<string, number> = {}
    config?.params.forEach((p) => {
      params[p.name] = p.defaultValue
    })
    updateCondition(index, {
      indicator: newIndicator,
      params,
      condition: conditions[index].condition,
      value: conditions[index].value,
    })
  }

  const handleFieldChange = (index: number, field: Partial<SignalCondition>) => {
    updateCondition(index, { ...conditions[index], ...field })
  }

  const handleParamChange = (index: number, name: string, value: number) => {
    handleFieldChange(index, {
      params: { ...conditions[index].params, [name]: value },
    })
  }

  return (
    <div className="space-y-4">
      {conditions.map((condition, i) => {
        const indicatorConfig = getIndicatorConfig(condition.indicator)

        return (
          <div key={i} className="space-y-3 rounded-lg border border-border p-3">
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
                  onClick={() => removeCondition(i)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Индикатор</Label>
                <Select value={condition.indicator} onValueChange={(v) => handleIndicatorChange(i, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDICATORS.map((ind) => (
                      <SelectItem key={ind.type} value={ind.type}>{ind.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Условие</Label>
                <Select
                  value={condition.condition}
                  onValueChange={(v) => handleFieldChange(i, { condition: v as ConditionType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {indicatorConfig && indicatorConfig.params.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {indicatorConfig.params.map((p) => (
                  <div key={p.name} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{p.label}</Label>
                    <Input
                      type="number"
                      value={condition.params[p.name] ?? p.defaultValue}
                      onChange={(e) => handleParamChange(i, p.name, Number(e.target.value))}
                      min={p.min}
                      max={p.max}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="w-1/2 space-y-1.5 sm:w-1/3">
              <Label className="text-xs text-muted-foreground">Значение</Label>
              <Input
                type="number"
                value={condition.value ?? ""}
                onChange={(e) =>
                  handleFieldChange(i, { value: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Опционально"
              />
            </div>
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" onClick={addCondition} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Добавить условие
      </Button>
    </div>
  )
}
