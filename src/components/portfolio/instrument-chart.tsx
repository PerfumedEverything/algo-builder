"use client"

import { useRef, useEffect } from "react"
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts"
import { isMarketOpen } from "@/lib/market-hours"

type FormingCandle = {
  time: UTCTimestamp
  open: number
  high: number
  low: number
}

type InstrumentChartProps = {
  candles: CandlestickData<Time>[]
  markers?: SeriesMarker<Time>[]
  height?: number
  livePrice?: number
  interval?: string
  brokerType?: string
}

const getCurrentCandleTime = (interval: string): UTCTimestamp => {
  const now = Math.floor(Date.now() / 1000)
  const intervals: Record<string, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1d": 86400 }
  const period = intervals[interval] ?? 300
  return (now - (now % period)) as UTCTimestamp
}

export const InstrumentChart = ({ candles, markers, height, livePrice, interval = "1d", brokerType }: InstrumentChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const formingCandleRef = useRef<FormingCandle | null>(null)

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return

    const styles = getComputedStyle(document.documentElement)
    const cssVar = (name: string) => {
      const raw = styles.getPropertyValue(name).trim()
      return raw.startsWith("hsl") || raw.startsWith("#") || raw.startsWith("rgb") ? raw : `hsl(${raw})`
    }

    const textColor = cssVar("--foreground")
    const borderColor = cssVar("--border")
    const mutedFg = cssVar("--muted-foreground")
    const cardBg = cssVar("--card")

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      width: containerRef.current.clientWidth,
      height: height ?? 400,
      autoSize: true,
      rightPriceScale: { borderColor },
      timeScale: { borderColor },
      crosshair: {
        horzLine: { color: mutedFg, labelBackgroundColor: cardBg },
        vertLine: { color: mutedFg, labelBackgroundColor: cardBg },
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })

    series.setData(candles)

    if (markers?.length) {
      const sorted = [...markers].sort((a, b) =>
        String(a.time).localeCompare(String(b.time)),
      )
      createSeriesMarkers(series, sorted)
    }

    chart.timeScale().fitContent()
    chartRef.current = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [candles, markers, height])

  useEffect(() => {
    if (!seriesRef.current || !livePrice || candles.length === 0) return
    if (brokerType !== "BYBIT" && !isMarketOpen()) return

    const candleTime = getCurrentCandleTime(interval)
    const forming = formingCandleRef.current

    if (!forming || forming.time !== candleTime) {
      formingCandleRef.current = { time: candleTime, open: livePrice, high: livePrice, low: livePrice }
    } else {
      formingCandleRef.current = {
        time: candleTime,
        open: forming.open,
        high: Math.max(forming.high, livePrice),
        low: Math.min(forming.low, livePrice),
      }
    }

    const current = formingCandleRef.current
    seriesRef.current.update({
      time: current.time,
      open: current.open,
      high: current.high,
      low: current.low,
      close: livePrice,
    })
  }, [livePrice, candles, interval, brokerType])

  return <div ref={containerRef} className="w-full" />
}
