"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { InstrumentSelect } from "@/components/shared/instrument-select"
import { ChartPeriodSelector, type ChartPeriod } from "@/components/portfolio/chart-period-selector"
import { AiAnalysisButton } from "@/components/portfolio/ai-analysis-button"
import { getCandlesForChartAction, getTradeMarkersAction, type ChartMarker } from "@/server/actions/chart-actions"
import { analyzeWithAiAction } from "@/server/actions/ai-analysis-actions"
import { getPortfolioAction } from "@/server/actions/broker-actions"
import type { BrokerInstrument } from "@/core/types"
import type { CandlestickData, SeriesMarker, Time } from "lightweight-charts"

const InstrumentChart = dynamic(
  () => import("@/components/portfolio/instrument-chart").then((m) => ({ default: m.InstrumentChart })),
  { ssr: false, loading: () => <Skeleton className="h-[500px] rounded-xl" /> },
)

const PERIOD_CONFIG: Record<ChartPeriod, { days: number; interval: string }> = {
  "1d": { days: 1, interval: "1m" },
  "1w": { days: 7, interval: "15m" },
  "1m": { days: 30, interval: "1h" },
  "3m": { days: 90, interval: "1d" },
  "1y": { days: 365, interval: "1d" },
}

export default function TerminalPage() {
  const [instrument, setInstrument] = useState<BrokerInstrument | null>(null)
  const [ticker, setTicker] = useState("")
  const [period, setPeriod] = useState<ChartPeriod>("3m")
  const [candles, setCandles] = useState<CandlestickData<Time>[]>([])
  const [markers, setMarkers] = useState<SeriesMarker<Time>[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCandles = useCallback(async (figi: string, p: ChartPeriod) => {
    setLoading(true)
    const { days, interval } = PERIOD_CONFIG[p]
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    const res = await getCandlesForChartAction(figi, interval, from.toISOString(), to.toISOString())
    if (res.success) setCandles(res.data as CandlestickData<Time>[])

    const portfolioRes = await getPortfolioAction()
    if (portfolioRes.success && portfolioRes.data) {
      const pos = portfolioRes.data.positions.find((p) => p.instrumentId === figi)
      if (pos?.operations.length) {
        const markersRes = await getTradeMarkersAction(figi, pos.operations)
        if (markersRes.success) setMarkers(markersRes.data as SeriesMarker<Time>[])
        else setMarkers([])
      } else {
        setMarkers([])
      }
    } else {
      setMarkers([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (instrument?.figi) fetchCandles(instrument.figi, period)
  }, [instrument, period, fetchCandles])

  const handleInstrumentSelect = useCallback((inst: BrokerInstrument) => {
    setInstrument(inst)
    setCandles([])
    setMarkers([])
  }, [])

  const handlePeriodChange = useCallback((p: ChartPeriod) => {
    setPeriod(p)
  }, [])

  const buildChartMessage = useCallback(() => {
    if (!instrument) return ""
    const last30 = candles.slice(-30)
    const lines = last30.map((c) => `${c.time} O:${c.open} H:${c.high} L:${c.low} C:${c.close}`)
    return `Инструмент: ${instrument.ticker}\nПериод: ${period}\nДанные OHLCV:\n${lines.join("\n")}`
  }, [instrument, candles, period])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Терминал</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-80">
          <InstrumentSelect
            instrumentType="STOCK"
            value={ticker}
            onChange={setTicker}
            onInstrumentSelect={handleInstrumentSelect}
          />
        </div>
        {instrument && <ChartPeriodSelector value={period} onChange={handlePeriodChange} />}
        {instrument && candles.length > 0 && (
          <AiAnalysisButton
            title={`Тех. анализ ${instrument.ticker}`}
            triggerLabel="Анализ с ИИ"
            analyzeAction={() => analyzeWithAiAction("chart", buildChartMessage())}
            variant="outline"
            size="sm"
          />
        )}
      </div>

      {!instrument && (
        <div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground">Выберите инструмент для просмотра графика</p>
        </div>
      )}

      {loading && <Skeleton className="h-[500px] rounded-xl" />}

      {instrument && !loading && candles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-sm text-muted-foreground">
            {instrument.name} ({instrument.ticker})
          </div>
          <InstrumentChart candles={candles} markers={markers} height={500} />
        </div>
      )}
    </div>
  )
}
