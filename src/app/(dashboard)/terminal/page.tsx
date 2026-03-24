"use client"

import { useState, useEffect, useCallback } from "react"

import type { BrokerInstrument, PortfolioPosition } from "@/core/types"
import type { OrderBookData, TopMover, PriceUpdate, PositionOperation } from "@/core/types"
import { getOrderBookAction, getTopMoversAction, getOperationsByTickerAction } from "@/server/actions/terminal-actions"
import { getPortfolioAction } from "@/server/actions/broker-actions"
import { TradingViewWidget } from "@/components/terminal/tradingview-widget"
import { PriceBar } from "@/components/terminal/price-bar"
import { OrderBook } from "@/components/terminal/order-book"
import { PositionsPanel } from "@/components/terminal/positions-panel"
import { TradeHistoryPanel } from "@/components/terminal/trade-history-panel"
import { TopMovers } from "@/components/terminal/top-movers"
import { InstrumentSelect } from "@/components/shared/instrument-select"
import { usePriceStream } from "@/hooks/use-price-stream"

export default function TerminalPage() {
  const [instrument, setInstrument] = useState<BrokerInstrument | null>(null)
  const [ticker, setTicker] = useState("")
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [operations, setOperations] = useState<PositionOperation[]>([])
  const [topMovers, setTopMovers] = useState<{ gainers: TopMover[]; losers: TopMover[] }>({ gainers: [], losers: [] })
  const [orderBookLoading, setOrderBookLoading] = useState(false)
  const [operationsLoading, setOperationsLoading] = useState(false)
  const [topMoversLoading, setTopMoversLoading] = useState(true)

  const priceUpdates = usePriceStream()

  const fetchOrderBook = useCallback(async (figi: string) => {
    setOrderBookLoading(true)
    try {
      const res = await getOrderBookAction(figi)
      if (res.success) setOrderBook(res.data)
    } finally {
      setOrderBookLoading(false)
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
    const loadInitial = async () => {
      const [portfolioRes, topMoversRes] = await Promise.all([
        getPortfolioAction(),
        getTopMoversAction(),
      ])
      if (portfolioRes.success && portfolioRes.data) {
        setPositions(portfolioRes.data.positions)
      }
      if (topMoversRes.success) {
        setTopMovers(topMoversRes.data)
      }
      setTopMoversLoading(false)
    }
    void loadInitial()
  }, [])

  useEffect(() => {
    if (!instrument) {
      setOrderBook(null)
      setOperations([])
      return
    }
    void fetchOrderBook(instrument.figi)
    void fetchOperations(instrument.ticker)
  }, [instrument, fetchOrderBook, fetchOperations])

  useEffect(() => {
    if (!instrument) return
    const interval = setInterval(() => {
      void fetchOrderBook(instrument.figi)
    }, 5_000)
    return () => clearInterval(interval)
  }, [instrument, fetchOrderBook])

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getTopMoversAction()
      if (res.success) setTopMovers(res.data)
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleInstrumentSelect = useCallback((inst: BrokerInstrument) => {
    setInstrument(inst)
    setOrderBook(null)
    setOperations([])
  }, [])

  const priceUpdate: PriceUpdate | undefined = instrument
    ? priceUpdates.get(instrument.figi)
    : undefined

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="flex items-center gap-4">
        <div className="w-64 shrink-0">
          <InstrumentSelect
            instrumentType="STOCK"
            value={ticker}
            onChange={setTicker}
            onInstrumentSelect={handleInstrumentSelect}
            showPrice={false}
          />
        </div>
        <PriceBar instrument={instrument} priceUpdate={priceUpdate} orderBook={orderBook} />
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <TradingViewWidget
            key={instrument?.ticker ?? "empty"}
            symbol={instrument ? `MOEX:${instrument.ticker}` : "MOEX:SBER"}
            theme="dark"
          />
        </div>
        {instrument && (
          <OrderBook data={orderBook} loading={orderBookLoading} />
        )}
      </div>

      {instrument && (
        <div className="grid grid-cols-2 gap-4">
          <PositionsPanel positions={positions} priceUpdates={priceUpdates} />
          <TradeHistoryPanel
            operations={operations}
            ticker={instrument.ticker}
            loading={operationsLoading}
          />
        </div>
      )}

      <TopMovers gainers={topMovers.gainers} losers={topMovers.losers} loading={topMoversLoading} />
    </div>
  )
}
