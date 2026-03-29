"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getGridStatusAction, stopGridAction } from "@/server/actions/grid-actions"
import type { GridOrderRow } from "@/server/repositories/grid-repository"

type GridStats = {
  totalBuys: number
  totalSells: number
  realizedPnl: number
}

type GridMonitorProps = {
  gridId: string
  onStop: () => void
  onLevelsChange?: (levels: Array<{ price: number; side: 'BUY' | 'SELL'; status: 'PENDING' | 'FILLED' | 'CANCELLED'; index: number }>) => void
}

export const GridMonitor = ({ gridId, onStop, onLevelsChange }: GridMonitorProps) => {
  const [orders, setOrders] = useState<GridOrderRow[]>([])
  const [stats, setStats] = useState<GridStats>({ totalBuys: 0, totalSells: 0, realizedPnl: 0 })
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [finalStats, setFinalStats] = useState<GridStats | null>(null)

  const fetchStatus = useCallback(async () => {
    const res = await getGridStatusAction(gridId)
    if (!res.success) return
    setOrders(res.data.orders)
    setStats(res.data.stats)
    setLoading(false)

    if (onLevelsChange) {
      const levels = res.data.orders.map(o => ({
        price: o.price,
        side: o.side as 'BUY' | 'SELL',
        status: o.status as 'PENDING' | 'FILLED' | 'CANCELLED',
        index: o.levelIndex,
      }))
      onLevelsChange(levels)
    }
  }, [gridId, onLevelsChange])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleStop = async () => {
    setStopping(true)
    try {
      const res = await stopGridAction(gridId)
      if (!res.success) {
        toast.error(res.error ?? 'Ошибка остановки Grid Bot')
        return
      }
      setFinalStats(res.data.stats)
      setSummaryOpen(true)
    } catch {
      toast.error('Ошибка остановки Grid Bot')
    } finally {
      setStopping(false)
    }
  }

  const handleSummaryClose = () => {
    setSummaryOpen(false)
    onStop()
  }

  const getRowClass = (order: GridOrderRow) => {
    if (order.status === 'FILLED' && order.side === 'SELL') return 'text-green-400'
    if (order.status === 'CANCELLED') return 'text-muted-foreground'
    if (order.side === 'BUY') return 'text-blue-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">P&L</p>
          <p className={`text-lg font-semibold ${stats.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.realizedPnl >= 0 ? '+' : ''}{stats.realizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3" /> Покупок
          </p>
          <p className="text-lg font-semibold">{stats.totalBuys}</p>
        </div>
        <div className="rounded border border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <TrendingDown className="h-3 w-3" /> Продаж
          </p>
          <p className="text-lg font-semibold">{stats.totalSells}</p>
        </div>
      </div>

      <div className="rounded border border-border overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-muted/50 text-xs text-muted-foreground font-medium">
          <span>#</span>
          <span>Цена</span>
          <span>Сторона</span>
          <span>Статус</span>
          <span>P&L</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {orders.map(order => (
            <div
              key={order.id}
              className={`grid grid-cols-5 gap-2 px-3 py-1.5 text-xs border-t border-border ${getRowClass(order)}`}
            >
              <span>{order.levelIndex}</span>
              <span>{order.price.toFixed(2)}</span>
              <span>{order.side}</span>
              <span>{order.status}</span>
              <span>{order.realizedPnl > 0 ? order.realizedPnl.toFixed(2) : '—'}</span>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">Нет ордеров</div>
          )}
        </div>
      </div>

      <Button variant="destructive" className="w-full" disabled={stopping} onClick={() => setConfirmOpen(true)}>
        {stopping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
        Остановить Grid Bot
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Остановить Grid Bot?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Все открытые ордера будут отменены. Текущий P&L: {stats.realizedPnl.toFixed(2)} USDT
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={() => { setConfirmOpen(false); handleStop() }} disabled={stopping}>
              Остановить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryOpen} onOpenChange={open => { if (!open) handleSummaryClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grid Bot остановлен</DialogTitle>
          </DialogHeader>
          {finalStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Итоговый P&L</p>
                  <p className={`text-xl font-bold ${finalStats.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {finalStats.realizedPnl >= 0 ? '+' : ''}{finalStats.realizedPnl.toFixed(2)} USDT
                  </p>
                </div>
                <div className="rounded border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Покупок</p>
                  <p className="text-xl font-bold">{finalStats.totalBuys}</p>
                </div>
                <div className="rounded border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Продаж</p>
                  <p className="text-xl font-bold">{finalStats.totalSells}</p>
                </div>
              </div>
              <Button onClick={handleSummaryClose} className="w-full">Закрыть</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
