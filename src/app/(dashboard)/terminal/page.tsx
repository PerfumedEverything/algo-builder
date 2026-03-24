"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { InstrumentSelect } from "@/components/shared/instrument-select"
import { ChartPeriodSelector, type ChartPeriod } from "@/components/portfolio/chart-period-selector"
import { AiAnalysisButton } from "@/components/portfolio/ai-analysis-button"
import { PriceBar } from "@/components/terminal/price-bar"
import { OrderBook } from "@/components/terminal/order-book"
import { PositionsPanel } from "@/components/terminal/positions-panel"
import { TradeHistoryPanel } from "@/components/terminal/trade-history-panel"
import { getCandlesForChartAction, getTradeMarkersAction, type ChartMarker } from "@/server/actions/chart-actions"
import { analyzeWithAiAction } from "@/server/actions/ai-analysis-actions"
import { getPortfolioAction } from "@/server/actions/broker-actions"
import { getOrderBookAction, getOperationsByTickerAction } from "@/server/actions/terminal-actions"
import { usePriceStream } from "@/hooks/use-price-stream"
import type { BrokerInstrument, PortfolioPosition, PositionOperation } from "@/core/types"
import type { OrderBookData } from "@/core/types"
import type { CandlestickData, SeriesMarker, Time } from "lightweight-charts"

const InstrumentChart = dynamic(
  () => import("@/components/portfolio/instrument-chart").then((m) => ({ default: m.InstrumentChart })),
  { ssr: false, loading: () => <Skeleton className="h-[450px] rounded-xl" /> },
)

const PERIOD_CONFIG: Record<ChartPeriod, { days: number; interval: string }> = {
  "1m": { days: 1, interval: "1m" },
  "5m": { days: 3, interval: "5m" },
  "15m": { days: 7, interval: "15m" },
  "1h": { days: 30, interval: "1h" },
  "1d": { days: 365, interval: "1d" },
  "1w": { days: 730, interval: "1w" },
}

export default function TerminalPage() {
  const [instrument, setInstrument] = useState<BrokerInstrument | null>(null)
  const [ticker, setTicker] = useState("")
  const [period, setPeriod] = useState<ChartPeriod>("1d")
  const [candles, setCandles] = useState<CandlestickData<Time>[]>([])
  const [markers, setMarkers] = useState<SeriesMarker<Time>[]>([])
  const [loading, setLoading] = useState(false)

  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [orderBookLoading, setOrderBookLoading] = useState(false)
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [positionsLoading, setPositionsLoading] = useState(false)
  const [operations, setOperations] = useState<PositionOperation[]>([])
  const [operationsLoading, setOperationsLoading] = useState(false)

  const prices = usePriceStream()

  const fetchCandles = useCallback(async (figi: string, p: ChartPeriod) => {
    setLoading(true)
    try {
      const { days, interval } = PERIOD_CONFIG[p]
      const to = new Date()
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
      const [res, portfolioRes] = await Promise.all([
        getCandlesForChartAction(figi, interval, from.toISOString(), to.toISOString()),
        getPortfolioAction(),
      ])
      if (res.success) setCandles(res.data as CandlestickData<Time>[])

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
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOrderBook = useCallback(async (figi: string) => {
    setOrderBookLoading(true)
    try {
      const res = await getOrderBookAction(figi, 10)
      if (res.success) setOrderBook(res.data)
    } finally {
      setOrderBookLoading(false)
    }
  }, [])

  const fetchPositions = useCallback(async () => {
    setPositionsLoading(true)
    try {
      const res = await getPortfolioAction()
      if (res.success && res.data) setPositions(res.data.positions)
    } finally {
      setPositionsLoading(false)
    }
  }, [])

  const fetchOperations = useCallback(async (t: string) => {
    setOperationsLoading(true)
    try {
      const res = await getOperationsByTickerAction(t)
      if (res.success) setOperations(res.data)
      else setOperations([])
    } finally {
      setOperationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (instrument?.figi) fetchCandles(instrument.figi, period)
  }, [instrument, period, fetchCandles])

  useEffect(() => {
    if (!instrument?.figi) return
    fetchOrderBook(instrument.figi)
    const interval = setInterval(() => fetchOrderBook(instrument.figi), 5000)
    return () => clearInterval(interval)
  }, [instrument, fetchOrderBook])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  useEffect(() => {
    if (ticker) fetchOperations(ticker)
    else setOperations([])
  }, [ticker, fetchOperations])

  const handleInstrumentSelect = useCallback((inst: BrokerInstrument) => {
    setInstrument(inst)
    setTicker(inst.ticker)
    setCandles([])
    setMarkers([])
    setOrderBook(null)
    setOperations([])
  }, [])

  const handlePositionSelect = useCallback(
    (positionTicker: string, figi: string) => {
      const inst: BrokerInstrument = {
        figi,
        ticker: positionTicker,
        name: positionTicker,
        type: "STOCK",
        currency: "rub",
        lot: 1,
      }
      handleInstrumentSelect(inst)
    },
    [handleInstrumentSelect],
  )

  const handlePeriodChange = useCallback((p: ChartPeriod) => {
    setPeriod(p)
  }, [])

  const buildChartMessage = useCallback(() => {
    if (!instrument) return ""
    const last30 = candles.slice(-30)
    const lines = last30.map((c) => `${c.time} O:${c.open} H:${c.high} L:${c.low} C:${c.close}`)
    return `Инструмент: ${instrument.ticker}\nПериод: ${period}\nДанные OHLCV:\n${lines.join("\n")}`
  }, [instrument, candles, period])

  const livePrice = instrument
    ? (prices.get(instrument.ticker) ?? prices.get(instrument.figi))
    : undefined

  const currentPrice = livePrice?.price ?? (candles.length > 0 ? (candles[candles.length - 1].close as number) : 0)
  const openPrice = candles.length > 0 ? (candles[0].open as number) : 0
  const change = openPrice > 0 ? ((currentPrice - openPrice) / openPrice) * 100 : 0
  const high = candles.length > 0 ? Math.max(...candles.map((c) => c.high as number)) : 0
  const low = candles.length > 0 ? Math.min(...candles.map((c) => c.low as number)) : 0
  const volume = candles.length > 0
    ? candles.reduce((sum, c) => sum + ((c as { volume?: number }).volume ?? 0), 0)
    : 0
  const bestBid = orderBook?.bids?.[0]?.price ?? 0
  const bestAsk = orderBook?.asks?.[0]?.price ?? 0

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-full sm:w-80">
          <InstrumentSelect
            instrumentType="STOCK"
            value={ticker}
            onChange={setTicker}
            onInstrumentSelect={handleInstrumentSelect}
            showPrice={false}
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

      {instrument && (
        <>
          <PriceBar
            instrument={instrument}
            price={currentPrice}
            change={change}
            high={high}
            low={low}
            volume={volume}
            bestBid={bestBid}
            bestAsk={bestAsk}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <div className="rounded-lg border border-border bg-card p-4 h-[450px]">
              {loading ? (
                <Skeleton className="h-full rounded-lg" />
              ) : candles.length > 0 ? (
                <InstrumentChart candles={candles} markers={markers} height={400} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground text-sm">Нет данных для графика</p>
                </div>
              )}
            </div>

            <div className="h-[450px] lg:h-[450px]">
              <OrderBook data={orderBook} loading={orderBookLoading && !orderBook} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PositionsPanel
              positions={positions}
              loading={positionsLoading}
              onSelectTicker={handlePositionSelect}
            />
            <TradeHistoryPanel
              operations={operations}
              ticker={ticker}
              loading={operationsLoading}
            />
          </div>
        </>
      )}
    </div>
  )
}
