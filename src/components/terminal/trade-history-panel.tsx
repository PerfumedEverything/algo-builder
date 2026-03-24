"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PositionOperation } from "@/core/types"

type TradeHistoryPanelProps = {
  operations: PositionOperation[]
  ticker: string
  loading: boolean
}

const formatPrice = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2 })

export const TradeHistoryPanel = ({ operations, ticker, loading }: TradeHistoryPanelProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">
        История сделок{ticker ? `: ${ticker}` : ""}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {loading ? (
        <div className="space-y-1 px-4 pb-4 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : operations.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Нет сделок по инструменту
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs py-1">Дата</TableHead>
              <TableHead className="text-xs py-1">Тип</TableHead>
              <TableHead className="text-xs py-1 text-right">Цена</TableHead>
              <TableHead className="text-xs py-1 text-right">Кол-во</TableHead>
              <TableHead className="text-xs py-1 text-right">Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="py-1 text-xs">
                  {new Date(op.date).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className={`py-1 text-xs font-medium ${op.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                  {op.type === "BUY" ? "Покупка" : "Продажа"}
                </TableCell>
                <TableCell className="py-1 text-right text-xs font-mono">
                  {formatPrice(op.price)}
                </TableCell>
                <TableCell className="py-1 text-right text-xs font-mono">
                  {op.quantity}
                </TableCell>
                <TableCell className="py-1 text-right text-xs font-mono">
                  {formatPrice(op.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
)
