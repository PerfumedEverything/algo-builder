"use client"

import type { BrokerInstrument } from "@/core/types"
import type { OrderBookData, PriceUpdate } from "@/core/types"

type PriceBarProps = {
  instrument: BrokerInstrument | null
  priceUpdate: PriceUpdate | undefined
  orderBook: OrderBookData | null
}

export const PriceBar = ({ instrument, priceUpdate, orderBook }: PriceBarProps) => {
  if (!instrument) {
    return (
      <div className="flex-1 bg-card border border-border rounded-lg px-6 py-3 flex items-center">
        <span className="text-muted-foreground text-sm">Выберите инструмент</span>
      </div>
    )
  }

  const price = priceUpdate?.price
  const bid = orderBook?.bids[0]?.price
  const ask = orderBook?.asks[0]?.price

  return (
    <div className="flex-1 bg-card border border-border rounded-lg px-6 py-3">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex flex-col">
          <span className="font-bold text-sm">{instrument.ticker}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[160px]">{instrument.name}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Цена</span>
          <span className={`font-mono font-semibold text-sm ${price ? "text-emerald-400" : "text-muted-foreground"}`}>
            {price ? price.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "---"}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Изменение</span>
          <span className="font-mono text-sm text-muted-foreground">---</span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Bid</span>
          <span className={`font-mono text-sm ${bid ? "text-emerald-400" : "text-muted-foreground"}`}>
            {bid ? bid.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "---"}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Ask</span>
          <span className={`font-mono text-sm ${ask ? "text-red-400" : "text-muted-foreground"}`}>
            {ask ? ask.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "---"}
          </span>
        </div>
      </div>
    </div>
  )
}
