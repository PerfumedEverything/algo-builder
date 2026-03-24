"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OrderBookData } from "@/core/types"

type OrderBookProps = {
  data: OrderBookData | null
  loading: boolean
}

const DEPTH = 10

const formatPrice = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2 })
const formatQty = (n: number) => n.toLocaleString("ru-RU")

export const OrderBook = ({ data, loading }: OrderBookProps) => (
  <Card className="w-[320px] shrink-0">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Стакан</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {loading ? (
        <div className="space-y-1 px-4 pb-4">
          {Array.from({ length: 21 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : !data ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Нет данных
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs py-1">Цена</TableHead>
              <TableHead className="text-xs py-1 text-right">Объем</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...data.asks].reverse().slice(0, DEPTH).map((level, i) => (
              <TableRow key={`ask-${i}`} className="bg-red-500/10 border-0">
                <TableCell className="py-0.5 text-xs font-mono text-red-400">
                  {formatPrice(level.price)}
                </TableCell>
                <TableCell className="py-0.5 text-xs font-mono text-right text-red-400">
                  {formatQty(level.quantity)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 border-0">
              <TableCell colSpan={2} className="py-1 text-xs text-center text-muted-foreground font-medium">
                Спред: {data.spread.toFixed(2)}
              </TableCell>
            </TableRow>
            {data.bids.slice(0, DEPTH).map((level, i) => (
              <TableRow key={`bid-${i}`} className="bg-green-500/10 border-0">
                <TableCell className="py-0.5 text-xs font-mono text-green-400">
                  {formatPrice(level.price)}
                </TableCell>
                <TableCell className="py-0.5 text-xs font-mono text-right text-green-400">
                  {formatQty(level.quantity)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
)
