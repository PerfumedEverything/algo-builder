"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { INDICATORS } from "@/core/config/indicators"
import type { StrategyCondition } from "@/core/types"

type StrategyCardConditionsProps = {
  conditions: StrategyCondition[]
  logic?: string
  type: "entry" | "exit"
}

const CONDITION_LABELS_RU: Record<string, string> = {
  GREATER_THAN: "Больше чем",
  LESS_THAN: "Меньше чем",
  CROSSES_ABOVE: "Пересекает вверх",
  CROSSES_BELOW: "Пересекает вниз",
  EQUALS: "Равно",
  ABOVE_BY_PERCENT: "Выше на %",
  BELOW_BY_PERCENT: "Ниже на %",
  MULTIPLIED_BY: "Кратно",
  BETWEEN: "Между",
}

const LOGIC_LABELS: Record<string, string> = { AND: "И", OR: "ИЛИ" }

const buildConditionText = (condition: StrategyCondition): string => {
  const indicator = INDICATORS.find((i) => i.type === condition.indicator)
  const label = indicator?.label ?? condition.indicator
  const paramStr = Object.values(condition.params).join(",")
  const indicatorDisplay = paramStr ? `${label}(${paramStr})` : label
  const conditionLabel = CONDITION_LABELS_RU[condition.condition] ?? condition.condition
  return `${indicatorDisplay} ${conditionLabel}${condition.value !== undefined ? ` ${condition.value}` : ""}`
}

const buildTooltipText = (condition: StrategyCondition): string => {
  const indicator = INDICATORS.find((i) => i.type === condition.indicator)
  return indicator?.description ?? condition.indicator
}

export const StrategyCardConditions = ({ conditions, logic, type }: StrategyCardConditionsProps) => {
  const arr = Array.isArray(conditions) ? conditions : [conditions]
  const separator = ` ${LOGIC_LABELS[logic ?? "AND"] ?? logic} `
  const labelColor = type === "entry" ? "text-emerald-400" : "text-red-400"
  const labelText = type === "entry" ? "Условие входа:" : "Условие выхода:"

  return (
    <p>
      <span className={labelColor}>{labelText}</span>{" "}
      <TooltipProvider>
        {arr.map((condition, i) => (
          <span key={i}>
            {i > 0 && <span className="text-muted-foreground">{separator}</span>}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50">
                  {buildConditionText(condition)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{buildTooltipText(condition)}</p>
              </TooltipContent>
            </Tooltip>
          </span>
        ))}
      </TooltipProvider>
    </p>
  )
}
