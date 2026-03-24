"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { OrderBookData, OrderBookLevel } from "@/core/types/terminal"
import { formatPrice, formatSpread } from "@/lib/terminal-utils"

type OrderBookProps = {
  data: OrderBookData | null
  loading?: boolean
}

const quantityFormatter = new Intl.NumberFormat("ru-RU")

const formatQty = (value: number) => quantityFormatter.format(value)

const buildCumulativeLevels = (levels: OrderBookLevel[]) => {
  let cumulative = 0
  return levels.map((level) => {
    cumulative += level.quantity
    return { ...level, cumulative }
  })
}

const SkeletonRows = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="border-0">
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-14" /></TableCell>
      </TableRow>
    ))}
  </>
)

export const OrderBook = ({ data, loading }: OrderBookProps) => {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card h-full">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Стакан</span>
        </div>
        <div className="overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Цена</TableHead>
                <TableHead>Объем</TableHead>
                <TableHead>Всего</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SkeletonRows />
              <SkeletonRows />
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-card h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Нет данных</span>
      </div>
    )
  }

  const sortedAsks = [...data.asks].sort((a, b) => b.price - a.price)
  const sortedBids = [...data.bids].sort((a, b) => b.price - a.price)

  const asksReversedForCumulative = [...sortedAsks].reverse()
  const asksWithCumulative = buildCumulativeLevels(asksReversedForCumulative).reverse()
  const bidsWithCumulative = buildCumulativeLevels(sortedBids)

  const maxAskCumulative = asksWithCumulative.length > 0
    ? asksWithCumulative[0].cumulative
    : 1
  const maxBidCumulative = bidsWithCumulative.length > 0
    ? bidsWithCumulative[bidsWithCumulative.length - 1].cumulative
    : 1

  return (
    <div className="rounded-lg border border-border bg-card h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm font-semibold">Стакан</span>
      </div>
      <div className="overflow-y-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Цена</TableHead>
              <TableHead className="text-xs">Объем</TableHead>
              <TableHead className="text-xs">Всего</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asksWithCumulative.map((level, i) => {
              const pct = (level.cumulative / maxAskCumulative) * 100
              return (
                <TableRow key={`ask-${i}`} className="relative border-0 hover:bg-transparent">
                  <TableCell colSpan={3} className="p-0">
                    <div className="relative flex items-center">
                      <div
                        className="absolute inset-0 bg-red-500/10"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex w-full">
                        <span className="flex-1 px-2 py-1 text-xs font-mono text-red-400">
                          {formatPrice(level.price)}
                        </span>
                        <span className="flex-1 px-2 py-1 text-xs font-mono">
                          {formatQty(level.quantity)}
                        </span>
                        <span className="flex-1 px-2 py-1 text-xs font-mono text-muted-foreground">
                          {formatQty(level.cumulative)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}

            <TableRow className="border-y border-border hover:bg-transparent">
              <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-1">
                Спред: {formatSpread(data.spread)}
              </TableCell>
            </TableRow>

            {bidsWithCumulative.map((level, i) => {
              const pct = (level.cumulative / maxBidCumulative) * 100
              return (
                <TableRow key={`bid-${i}`} className="relative border-0 hover:bg-transparent">
                  <TableCell colSpan={3} className="p-0">
                    <div className="relative flex items-center">
                      <div
                        className="absolute inset-0 bg-emerald-500/10"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex w-full">
                        <span className="flex-1 px-2 py-1 text-xs font-mono text-emerald-400">
                          {formatPrice(level.price)}
                        </span>
                        <span className="flex-1 px-2 py-1 text-xs font-mono">
                          {formatQty(level.quantity)}
                        </span>
                        <span className="flex-1 px-2 py-1 text-xs font-mono text-muted-foreground">
                          {formatQty(level.cumulative)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
