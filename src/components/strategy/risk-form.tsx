"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStrategyStore } from "@/hooks/use-strategy-store"

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
        <Label className="text-xs text-muted-foreground">Сумма для торговли (₽)</Label>
        <Input
          type="number"
          value={risks.tradeAmount ?? ""}
          onChange={(e) => updateRisk("tradeAmount", e.target.value)}
          placeholder="100000"
          min={0}
          step={1000}
        />
        <p className="text-xs text-muted-foreground">Какой частью портфеля торговать по этой стратегии</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Stop Loss (%)</Label>
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
          <Label className="text-xs text-muted-foreground">Take Profit (%)</Label>
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
          <Label className="text-xs text-muted-foreground">Размер позиции (лоты)</Label>
          <Input
            type="number"
            value={risks.maxPositionSize ?? ""}
            onChange={(e) => updateRisk("maxPositionSize", e.target.value)}
            placeholder="10"
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Trailing Stop (%)</Label>
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
