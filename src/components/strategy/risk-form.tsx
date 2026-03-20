"use client"

import { HelpCircle } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useStrategyStore } from "@/hooks/use-strategy-store"

const HintLabel = ({ label, hint }: { label: string; hint: string }) => (
  <div className="flex items-center gap-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Tooltip>
      <TooltipTrigger type="button" tabIndex={-1}>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-52 text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  </div>
)

export const RiskForm = () => {
  const { config, setRisks } = useStrategyStore()
  const { risks } = config

  const updateRisk = (field: string, value: string) => {
    setRisks({
      ...risks,
      [field]: value ? Number(value) : undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <HintLabel
          label="Сумма для торговли (₽)"
          hint="Сколько рублей выделить на эту стратегию. От этой суммы рассчитывается количество лотов при покупке."
        />
        <Input
          type="number"
          value={risks.tradeAmount ?? ""}
          onChange={(e) => updateRisk("tradeAmount", e.target.value)}
          placeholder="100000"
          min={0}
          step={1000}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <HintLabel
            label="Stop Loss (%)"
            hint="Максимальный допустимый убыток в %. Если цена упадёт на этот процент от цены входа — позиция будет закрыта."
          />
          <Input
            type="number"
            value={risks.stopLoss ?? ""}
            onChange={(e) => updateRisk("stopLoss", e.target.value)}
            placeholder="2"
            min={0}
            max={100}
            step={0.1}
          />
        </div>
        <div className="space-y-2">
          <HintLabel
            label="Take Profit (%)"
            hint="Целевая прибыль в %. Если цена вырастет на этот процент от цены входа — позиция будет закрыта с прибылью."
          />
          <Input
            type="number"
            value={risks.takeProfit ?? ""}
            onChange={(e) => updateRisk("takeProfit", e.target.value)}
            placeholder="4"
            min={0}
            max={1000}
            step={0.1}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <HintLabel
            label="Размер позиции (лоты)"
            hint="Максимальное количество лотов для покупки. Ограничивает размер позиции независимо от суммы."
          />
          <Input
            type="number"
            value={risks.maxPositionSize ?? ""}
            onChange={(e) => updateRisk("maxPositionSize", e.target.value)}
            placeholder="10"
            min={1}
          />
        </div>
        <div className="space-y-2">
          <HintLabel
            label="Trailing Stop (%)"
            hint="Скользящий стоп в %. Следует за ценой вверх, но не опускается. Фиксирует прибыль если цена развернётся."
          />
          <Input
            type="number"
            value={risks.trailingStop ?? ""}
            onChange={(e) => updateRisk("trailingStop", e.target.value)}
            placeholder="1.5"
            min={0}
            max={100}
            step={0.1}
          />
        </div>
      </div>
    </div>
  )
}
