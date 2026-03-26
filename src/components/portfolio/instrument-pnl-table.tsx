"use client"

import type { InstrumentPnl } from "@/core/types"

type InstrumentPnlTableProps = {
  data: InstrumentPnl[]
  loading: boolean
}

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value)

export const InstrumentPnlTable = ({ data, loading }: InstrumentPnlTableProps) => {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Нет данных по инструментам</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">P&L по инструментам</h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.ticker} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <div>
              <p className="text-sm font-medium">{item.ticker}</p>
              <p className="text-xs text-muted-foreground">{item.strategyCount} стратегий</p>
            </div>
            <p className={`text-sm font-semibold ${item.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {item.totalPnl >= 0 ? "+" : ""}{formatRub(item.totalPnl)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
