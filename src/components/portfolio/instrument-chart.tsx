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
} from "lightweight-charts"

type InstrumentChartProps = {
  candles: CandlestickData<Time>[]
  markers?: SeriesMarker<Time>[]
  height?: number
  livePrice?: number
}

export const InstrumentChart = ({ candles, markers, height, livePrice }: InstrumentChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)

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
    const lastCandle = candles[candles.length - 1]
    seriesRef.current.update({
      time: lastCandle.time,
      open: lastCandle.open,
      high: Math.max(lastCandle.high as number, livePrice),
      low: Math.min(lastCandle.low as number, livePrice),
      close: livePrice,
    })
  }, [livePrice, candles])

  return <div ref={containerRef} className="w-full" />
}
