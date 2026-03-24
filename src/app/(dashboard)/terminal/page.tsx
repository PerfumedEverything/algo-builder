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

export default function TerminalPage() {
  const [instrument, setInstrument] = useState<BrokerInstrument | null>(null)
  const [ticker, setTicker] = useState("")
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
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="w-64">
        <InstrumentSelect
          instrumentType="STOCK"
          value={ticker}
          onChange={setTicker}
          onInstrumentSelect={handleInstrumentSelect}
          showPrice={false}
        />
      </div>

      <TradingViewWidget
        key={instrument?.ticker ?? "empty"}
        symbol={instrument ? `MOEX:${instrument.ticker}` : "MOEX:SBER"}
        theme="dark"
      />

      <div className="grid grid-cols-2 gap-4">
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
