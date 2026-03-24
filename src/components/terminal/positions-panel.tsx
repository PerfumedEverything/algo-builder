"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PortfolioPosition } from "@/core/types"
import type { PriceUpdate } from "@/core/types"

type PositionsPanelProps = {
  positions: PortfolioPosition[]
  priceUpdates: Map<string, PriceUpdate>
}

const formatPrice = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2 })
const formatPnl = (n: number) => (n >= 0 ? "+" : "") + n.toLocaleString("ru-RU", { minimumFractionDigits: 2 })

export const PositionsPanel = ({ positions, priceUpdates }: PositionsPanelProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Открытые позиции</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {positions.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Нет открытых позиций
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs py-1">Тикер</TableHead>
              <TableHead className="text-xs py-1 text-right">Кол-во</TableHead>
              <TableHead className="text-xs py-1 text-right">Ср. цена</TableHead>
              <TableHead className="text-xs py-1 text-right">Текущая</TableHead>
              <TableHead className="text-xs py-1 text-right">П/У</TableHead>
              <TableHead className="text-xs py-1 text-right">П/У %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos) => {
              const realtimeUpdate = priceUpdates.get(pos.instrumentId)
              const currentPrice = realtimeUpdate ? realtimeUpdate.price : pos.currentPrice
              const pnl = realtimeUpdate
                ? (realtimeUpdate.price - pos.averagePrice) * pos.quantity
                : pos.expectedYieldAbsolute
              const pnlPct = pos.averagePrice > 0
                ? ((currentPrice - pos.averagePrice) / pos.averagePrice) * 100
                : 0
              const isPositive = pnl >= 0

              return (
                <TableRow key={pos.instrumentId}>
                  <TableCell className="py-1">
                    <span className="font-mono font-medium text-xs">{pos.ticker}</span>
                  </TableCell>
                  <TableCell className="py-1 text-right text-xs font-mono">{pos.quantity}</TableCell>
                  <TableCell className="py-1 text-right text-xs font-mono">
                    {formatPrice(pos.averagePrice)}
                  </TableCell>
                  <TableCell className="py-1 text-right text-xs font-mono">
                    {formatPrice(currentPrice)}
                  </TableCell>
                  <TableCell className={`py-1 text-right text-xs font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPnl(pnl)}
                  </TableCell>
                  <TableCell className={`py-1 text-right text-xs font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPnl(pnlPct)}%
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
)
