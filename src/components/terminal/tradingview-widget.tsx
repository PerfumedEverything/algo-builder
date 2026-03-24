"use client"

import { useEffect, useRef } from "react"

type TradingViewWidgetProps = {
  symbol: string
  theme?: "light" | "dark"
}

export const TradingViewWidget = ({ symbol, theme = "dark" }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      interval: "D",
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
  }, [symbol, theme])

  return (
    <div className="h-[600px] rounded-lg border border-border overflow-hidden">
      <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
    </div>
  )
}
