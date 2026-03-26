"use client"

import type { ReactNode } from "react"
import { TrendingUp, TrendingDown, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { TopMover } from "@/core/types"
import { formatPrice, formatChange, getChangeColor } from "@/lib/terminal-utils"

export type TopMoversPanelProps = {
  gainers: TopMover[]
  losers: TopMover[]
  loading: boolean
  onSelect: (ticker: string) => void
  isMarketOpen: boolean
}

type TopMoversSectionProps = {
  title: string
  icon: ReactNode
  movers: TopMover[]
  loading: boolean
  onSelect: (ticker: string) => void
  isMarketOpen: boolean
}

const SkeletonRows = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    ))}
  </>
)

const TopMoversSection = ({ title, icon, movers, loading, onSelect, isMarketOpen }: TopMoversSectionProps) => (
  <div className="rounded-lg border border-border bg-card overflow-hidden">
    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {!isMarketOpen && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          <Clock className="h-3 w-3" />
          Биржа закрыта
        </span>
      )}
    </div>
    {loading ? (
      <SkeletonRows />
    ) : (
      movers.map((mover) => (
        <button
          key={mover.ticker}
          type="button"
          onClick={() => onSelect(mover.ticker)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold font-mono">{mover.ticker}</span>
            <span className="text-xs text-muted-foreground truncate">{mover.shortName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-mono">{formatPrice(mover.price)} ₽</span>
            <span className={`text-xs font-mono ${getChangeColor(mover.changePct)}`}>
              {formatChange(mover.changePct)}
            </span>
          </div>
        </button>
      ))
    )}
  </div>
)

export const TopMoversPanel = ({ gainers, losers, loading, onSelect, isMarketOpen }: TopMoversPanelProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <TopMoversSection
      title="Топ роста"
      icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
      movers={gainers}
      loading={loading}
      onSelect={onSelect}
      isMarketOpen={isMarketOpen}
    />
    <TopMoversSection
      title="Топ падения"
      icon={<TrendingDown className="h-4 w-4 text-red-500" />}
      movers={losers}
      loading={loading}
      onSelect={onSelect}
      isMarketOpen={isMarketOpen}
    />
  </div>
)
