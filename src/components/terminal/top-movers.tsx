"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { TopMover } from "@/core/types"

type TopMoversProps = {
  gainers: TopMover[]
  losers: TopMover[]
  loading: boolean
}

const formatPrice = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2 })
const formatPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%"

const MoverTable = ({ movers, isGainer }: { movers: TopMover[]; isGainer: boolean }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="text-xs py-1">Тикер</TableHead>
        <TableHead className="text-xs py-1 text-right">Цена</TableHead>
        <TableHead className="text-xs py-1 text-right">Изменение %</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {movers.map((m) => (
        <TableRow key={m.ticker}>
          <TableCell className="py-1">
            <div className="flex flex-col">
              <span className="font-mono font-medium text-xs">{m.ticker}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{m.shortName}</span>
            </div>
          </TableCell>
          <TableCell className="py-1 text-right text-xs font-mono">
            {formatPrice(m.price)}
          </TableCell>
          <TableCell className={`py-1 text-right text-xs font-mono font-medium ${isGainer ? "text-emerald-400" : "text-red-400"}`}>
            <div className="flex items-center justify-end gap-1">
              {isGainer ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPct(m.changePct)}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)

export const TopMovers = ({ gainers, losers, loading }: TopMoversProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Лидеры роста
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {gainers.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Нет данных
            </div>
          ) : (
            <MoverTable movers={gainers} isGainer={true} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            Лидеры падения
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {losers.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Нет данных
            </div>
          ) : (
            <MoverTable movers={losers} isGainer={false} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
