"use client"

import { useEffect, useRef } from "react"

type TradingViewWidgetProps = {
  symbol: string
  theme?: "light" | "dark"
  interval?: string
}

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "1D": "D",
  "1W": "W",
  "1M": "M",
}

const RANGE_MAP: Record<string, string> = {
  "1": "1D",
  "5": "5D",
  "15": "1M",
  "30": "3M",
  "60": "3M",
  "240": "6M",
  "D": "12M",
  "W": "60M",
  "M": "60M",
}

export const TradingViewWidget = ({ symbol, theme = "dark", interval = "1D" }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    const tvInterval = INTERVAL_MAP[interval] ?? "D"
    const tvRange = RANGE_MAP[tvInterval] ?? "12M"

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      interval: tvInterval,
      range: tvRange,
      timezone: "Europe/Moscow",
      theme: theme ?? "dark",
      style: "1",
      locale: "ru",
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      support_host: "https://www.tradingview.com",
      width: "100%",
      height: "100%",
    })

    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ""
    }
  }, [symbol, theme, interval])

  return (
    <div className="min-h-[300px] sm:min-h-[500px] h-[400px] sm:h-[600px] rounded-lg border border-border overflow-hidden">
      <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
    </div>
  )
}
