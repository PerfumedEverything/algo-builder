"use client"

import { useRef, useEffect } from "react"
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  ColorType,
  type IChartApi,
  type CandlestickData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts"

type InstrumentChartProps = {
  candles: CandlestickData<Time>[]
  markers?: SeriesMarker<Time>[]
  height?: number
}

export const InstrumentChart = ({ candles, markers, height }: InstrumentChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--foreground))",
      },
      grid: {
        vertLines: { color: "hsl(var(--border))" },
        horzLines: { color: "hsl(var(--border))" },
      },
      width: containerRef.current.clientWidth,
      height: height ?? 400,
      autoSize: true,
      rightPriceScale: { borderColor: "hsl(var(--border))" },
      timeScale: { borderColor: "hsl(var(--border))" },
      crosshair: {
        horzLine: {
          color: "hsl(var(--muted-foreground))",
          labelBackgroundColor: "hsl(var(--card))",
        },
        vertLine: {
          color: "hsl(var(--muted-foreground))",
          labelBackgroundColor: "hsl(var(--card))",
        },
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

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [candles, markers, height])

  return <div ref={containerRef} className="w-full" />
}
