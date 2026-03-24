"use client"

import { useState, useEffect, useCallback } from "react"

import type { BrokerInstrument, PortfolioPosition } from "@/core/types"
import type { PositionOperation } from "@/core/types"
import { getOperationsByTickerAction } from "@/server/actions/terminal-actions"
import { getPortfolioAction } from "@/server/actions/broker-actions"
import { TradingViewWidget } from "@/components/terminal/tradingview-widget"
import { PositionsPanel } from "@/components/terminal/positions-panel"
import { TradeHistoryPanel } from "@/components/terminal/trade-history-panel"
import { InstrumentSelect } from "@/components/shared/instrument-select"
import { cn } from "@/lib/utils"

const TIMEFRAMES = [
  { label: "1м", value: "1m" },
  { label: "5м", value: "5m" },
  { label: "15м", value: "15m" },
  { label: "1ч", value: "1h" },
  { label: "1Д", value: "1D" },
  { label: "1Н", value: "1W" },
]

export default function TerminalPage() {
  const [instrument, setInstrument] = useState<BrokerInstrument | null>(null)
  const [ticker, setTicker] = useState("")
  const [timeframe, setTimeframe] = useState("1D")
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [operations, setOperations] = useState<PositionOperation[]>([])
  const [operationsLoading, setOperationsLoading] = useState(false)

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
    const loadPortfolio = async () => {
      const res = await getPortfolioAction()
      if (res.success && res.data) {
        setPositions(res.data.positions)
      }
    }
    void loadPortfolio()
  }, [])

  useEffect(() => {
    if (!instrument) {
      setOperations([])
      return
    }
    void fetchOperations(instrument.ticker)
  }, [instrument, fetchOperations])

  const handleInstrumentSelect = useCallback((inst: BrokerInstrument) => {
    setInstrument(inst)
    setOperations([])
  }, [])

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <InstrumentSelect
            instrumentType="STOCK"
            value={ticker}
            onChange={setTicker}
            onInstrumentSelect={handleInstrumentSelect}
            showPrice={false}
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                timeframe === tf.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <TradingViewWidget
        key={`${instrument?.ticker ?? "empty"}-${timeframe}`}
        symbol={instrument ? `MOEX:${instrument.ticker}` : "MOEX:SBER"}
        theme="dark"
        interval={timeframe}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PositionsPanel positions={positions} priceUpdates={new Map()} />
        <TradeHistoryPanel
          operations={operations}
          ticker={instrument?.ticker ?? ""}
          loading={operationsLoading}
        />
      </div>
    </div>
  )
}
