"use client"

import { useEffect, useState } from "react"
import { getFundamentalsAction } from "@/server/actions/fundamental-actions"
import { analyzeWithAiAction } from "@/server/actions/ai-analysis-actions"
import { AiAnalysisButton } from "./ai-analysis-button"
import { Skeleton } from "@/components/ui/skeleton"
import { getPeColor, getPbColor, getDivYieldColor, getScoreColor, getScoreLabel } from "./fundamental-color-utils"
import type { FundamentalMetrics } from "@/core/types"

type FundamentalCardProps = {
  ticker: string
  currentPrice: number
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

const isStale = (lastUpdated: string): boolean =>
  Date.now() - new Date(lastUpdated).getTime() > NINETY_DAYS_MS

export const FundamentalCard = ({ ticker, currentPrice }: FundamentalCardProps) => {
  const [metrics, setMetrics] = useState<FundamentalMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFundamentalsAction(ticker, currentPrice).then((res) => {
      if (res.success && res.data) setMetrics(res.data)
      setLoading(false)
    })
  }, [ticker, currentPrice])

  if (loading) return <Skeleton className="h-20 w-full rounded-lg" />

  if (!metrics || !metrics.hasFundamentals) {
    return (
      <p className="py-2 text-xs text-muted-foreground">Нет фундаментальных данных</p>
    )
  }

  const analyzeAction = () =>
    analyzeWithAiAction(
      "fundamental",
      `Тикер: ${ticker}\nP/E: ${metrics.pe ?? "—"}\nP/B: ${metrics.pb ?? "—"}\nДивидендная доходность: ${metrics.dividendYield !== null ? `${metrics.dividendYield}%` : "—"}\nСкоринг: ${metrics.score}/10 (${getScoreLabel(metrics.scoreLabel)})\nТекущая цена: ${currentPrice}`,
    )

  return (
    <div className="mb-2 ml-4 mr-2 rounded-lg bg-accent/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Фундаментальный анализ</p>
        <AiAnalysisButton
          title={`Фундаментальный анализ: ${ticker}`}
          triggerLabel="AI анализ"
          analyzeAction={analyzeAction}
          variant="default"
          size="sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">P/E: </span>
          <span className={getPeColor(metrics.pe, 15)}>
            {metrics.pe !== null ? metrics.pe.toFixed(1) : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">P/B: </span>
          <span className={getPbColor(metrics.pb)}>
            {metrics.pb !== null ? metrics.pb.toFixed(2) : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Див: </span>
          <span className={getDivYieldColor(metrics.dividendYield)}>
            {metrics.dividendYield !== null ? `${metrics.dividendYield.toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>
      <div className="mt-2 text-xs">
        <span className="text-muted-foreground">Скоринг: </span>
        <span className={getScoreColor(metrics.score)}>
          {metrics.score}/10 — {getScoreLabel(metrics.scoreLabel)}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Данные от: {new Date(metrics.lastUpdated).toLocaleDateString("ru-RU")}
        {isStale(metrics.lastUpdated) && (
          <span className="ml-2 text-orange-400">Данные могут быть устаревшими</span>
        )}
      </div>
    </div>
  )
}
