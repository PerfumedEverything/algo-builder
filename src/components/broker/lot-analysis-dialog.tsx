"use client"

import { Layers } from "lucide-react"

import type { PositionOperation } from "@/core/types"
import { analyzeLotAction } from "@/server/actions/portfolio-actions"
import { AiAnalysisButton } from "@/components/portfolio/ai-analysis-button"

type LotAnalysisDialogProps = {
  ticker: string
  operations: PositionOperation[]
  currentPrice: number
}

export const LotAnalysisDialog = ({ ticker, operations, currentPrice }: LotAnalysisDialogProps) => {
  const analyzeAction = () => analyzeLotAction(ticker, operations, currentPrice)

  return (
    <AiAnalysisButton
      title={`AI анализ остатков — ${ticker}`}
      analyzeAction={analyzeAction}
      triggerLabel="AI анализ"
      triggerIcon={<Layers className="h-3.5 w-3.5" />}
      size="sm"
      variant="ghost"
    />
  )
}
