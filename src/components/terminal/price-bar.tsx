"use client"

import { ArrowUp, ArrowDown } from "lucide-react"
import type { BrokerInstrument } from "@/core/types/broker"
import { formatPrice, formatVolume, formatChange, getChangeColor } from "@/lib/terminal-utils"

type PriceBarProps = {
  instrument: BrokerInstrument
  price: number
  change: number
  high: number | null
  low: number | null
  volume: number | null
  bestBid: number
  bestAsk: number
  brokerType?: string
}

const Separator = () => (
  <span className="text-muted-foreground/50 mx-3">|</span>
)

export const PriceBar = ({
  instrument,
  price,
  change,
  high,
  low,
  volume,
  bestBid,
  bestAsk,
  brokerType,
}: PriceBarProps) => {
  const changeColor = getChangeColor(change)
  const ChangeIcon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : null

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-y-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{instrument.ticker}</span>
          <span className="font-mono text-lg">{formatPrice(price, brokerType)}</span>
          <span className={`flex items-center gap-0.5 font-mono text-sm ${changeColor}`}>
            {ChangeIcon && <ChangeIcon className="h-3.5 w-3.5" />}
            {formatChange(change)}
          </span>
        </div>

        <div className="hidden md:flex items-center">
          <Separator />
          <span className="text-sm">
            <span className="text-muted-foreground">H:</span>
            <span className="font-mono ml-1">{high !== null ? formatPrice(high, brokerType) : "—"}</span>
            <span className="text-muted-foreground ml-2">L:</span>
            <span className="font-mono ml-1">{low !== null ? formatPrice(low, brokerType) : "—"}</span>
          </span>

          <Separator />
          <span className="text-sm">
            <span className="text-muted-foreground">Vol:</span>
            <span className="font-mono ml-1">{volume !== null ? formatVolume(volume) : "—"}</span>
          </span>

          <Separator />
          <span className="text-sm">
            <span className="text-muted-foreground">Бид:</span>
            <span className="font-mono ml-1">{formatPrice(bestBid, brokerType)}</span>
            <span className="text-muted-foreground ml-2">Аск:</span>
            <span className="font-mono ml-1">{formatPrice(bestAsk, brokerType)}</span>
          </span>
        </div>

        <div className="flex md:hidden w-full items-center flex-wrap gap-x-3 gap-y-1 text-sm mt-1">
          <span>
            <span className="text-muted-foreground">H:</span>
            <span className="font-mono ml-1">{high !== null ? formatPrice(high, brokerType) : "—"}</span>
            <span className="text-muted-foreground ml-2">L:</span>
            <span className="font-mono ml-1">{low !== null ? formatPrice(low, brokerType) : "—"}</span>
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span>
            <span className="text-muted-foreground">Vol:</span>
            <span className="font-mono ml-1">{volume !== null ? formatVolume(volume) : "—"}</span>
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span>
            <span className="text-muted-foreground">Бид:</span>
            <span className="font-mono ml-1">{formatPrice(bestBid, brokerType)}</span>
            <span className="text-muted-foreground ml-2">Аск:</span>
            <span className="font-mono ml-1">{formatPrice(bestAsk, brokerType)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
