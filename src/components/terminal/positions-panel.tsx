"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { PortfolioPosition } from "@/core/types/broker"
import { formatPrice, getChangeColor } from "@/lib/terminal-utils"

type PositionsPanelProps = {
  positions: PortfolioPosition[]
  loading?: boolean
  onSelectTicker?: (ticker: string, figi: string) => void
}

const SkeletonRows = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      </TableRow>
    ))}
  </>
)

export const PositionsPanel = ({ positions, loading, onSelectTicker }: PositionsPanelProps) => {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Открытые позиции</span>
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Инструмент</TableHead>
              <TableHead className="text-xs">Кол-во</TableHead>
              <TableHead className="text-xs">Ср. цена</TableHead>
              <TableHead className="text-xs">Текущая</TableHead>
              <TableHead className="text-xs">P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  Нет открытых позиций
                </TableCell>
              </TableRow>
            ) : (
              positions.map((position) => {
                const pnlColor = getChangeColor(position.expectedYieldAbsolute)
                return (
                  <TableRow
                    key={position.instrumentId}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelectTicker?.(position.ticker, position.instrumentId)}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{position.ticker}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[120px]">{position.name}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{position.quantity}</TableCell>
                    <TableCell className="font-mono text-sm">{formatPrice(position.averagePrice)}</TableCell>
                    <TableCell className="font-mono text-sm">{formatPrice(position.currentPrice)}</TableCell>
                    <TableCell>
                      <div className={`font-mono text-sm ${pnlColor}`}>
                        {formatPrice(position.expectedYieldAbsolute)} RUB
                      </div>
                      <div className={`text-xs ${pnlColor}`}>
                        {position.expectedYield >= 0 ? "+" : ""}
                        {position.expectedYield.toFixed(2)}%
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
