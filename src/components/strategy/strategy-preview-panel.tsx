"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { AiGeneratedStrategy } from "@/core/types"
import { getIndicatorConfig } from "@/core/config/indicators"

type StrategyPreviewPanelProps = {
  strategy: AiGeneratedStrategy
}

const formatCondition = (c: {
  indicator: string
  condition: string
  value?: number
  valueTo?: number
  params: Record<string, number>
}): string => {
  const config = getIndicatorConfig(c.indicator as never)
  const label = config?.label ?? c.indicator
  const period = c.params?.period ? ` (${c.params.period})` : ""
  if (c.condition === "BETWEEN" && c.valueTo !== undefined) {
    return `${label}${period} BETWEEN ${c.value ?? ""}–${c.valueTo}`
  }
  const condMap: Record<string, string> = {
    GREATER_THAN: ">",
    LESS_THAN: "<",
    CROSSES_ABOVE: "пересекает вверх",
    CROSSES_BELOW: "пересекает вниз",
    EQUALS: "=",
    ABOVE_BY_PERCENT: "выше на %",
    BELOW_BY_PERCENT: "ниже на %",
    MULTIPLIED_BY: "×",
  }
  const cond = condMap[c.condition] ?? c.condition
  return `${label}${period} ${cond} ${c.value ?? ""}`
}

export const StrategyPreviewPanel = ({ strategy }: StrategyPreviewPanelProps) => {
  const [expanded, setExpanded] = useState(true)
  const config = strategy.config as import("@/core/types/strategy").IndicatorStrategyConfig

  return (
    <div className="rounded-lg border border-primary/20 bg-muted/50 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-medium text-muted-foreground">Превью стратегии</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="font-semibold">{strategy.name}</p>

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {strategy.instrument.toUpperCase()}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
              {strategy.timeframe}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
              {strategy.instrumentType}
            </span>
          </div>

          {strategy.description && (
            <p className="text-sm text-muted-foreground">{strategy.description}</p>
          )}

          <div className="space-y-1.5 text-xs">
            <p className="font-medium text-foreground">Вход:</p>
            {config.entry.map((c, i) => (
              <p key={i} className="text-muted-foreground">
                {formatCondition(c)}
              </p>
            ))}
          </div>

          <div className="space-y-1.5 text-xs">
            <p className="font-medium text-foreground">Выход:</p>
            {config.exit.map((c, i) => (
              <p key={i} className="text-muted-foreground">
                {formatCondition(c)}
              </p>
            ))}
          </div>

          {(config.risks.stopLoss !== undefined || config.risks.takeProfit !== undefined) && (
            <div className="text-xs text-muted-foreground">
              {config.risks.stopLoss !== undefined && (
                <span className="mr-3">SL: {config.risks.stopLoss}%</span>
              )}
              {config.risks.takeProfit !== undefined && (
                <span className="mr-3">TP: {config.risks.takeProfit}%</span>
              )}
              {config.risks.trailingStop !== undefined && (
                <span>Trailing: {config.risks.trailingStop}%</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
