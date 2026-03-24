"use client"

import { Skeleton } from "@/components/ui/skeleton"
import type { PositionOperation } from "@/core/types/broker"
import { formatPrice } from "@/lib/terminal-utils"

type TradeHistoryPanelProps = {
  operations: PositionOperation[]
  ticker: string
  loading?: boolean
}

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const dd = String(date.getDate()).padStart(2, "0")
  const mo = String(date.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mo}`
}

const SkeletonRows = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2">
        <Skeleton className="h-8 w-10" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 flex-1" />
      </div>
    ))}
  </>
)

export const TradeHistoryPanel = ({ operations, ticker, loading }: TradeHistoryPanelProps) => {
  const sorted = [...operations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="text-sm font-semibold">История сделок</span>
        {ticker && (
          <span className="rounded bg-muted px-2 text-xs text-muted-foreground">{ticker}</span>
        )}
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        {loading ? (
          <SkeletonRows />
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              {ticker ? `Нет сделок по ${ticker}` : "Нет сделок"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((op) => (
              <div key={op.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex flex-col items-center min-w-[36px]">
                  <span className="text-xs font-mono">{formatTime(op.date)}</span>
                  <span className="text-xs text-muted-foreground font-mono">{formatDate(op.date)}</span>
                </div>
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${
                    op.type === "BUY"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {op.type === "BUY" ? "Куплено" : "Продано"}
                </span>
                <span className="text-sm">
                  {op.quantity} {ticker}{" "}
                  <span className="text-muted-foreground">по</span>{" "}
                  <span className="font-mono">{formatPrice(op.price)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
