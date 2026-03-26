"use client"

import { ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import type { RebalancingAction } from "@/core/types"

type RebalancingActionsProps = {
  actions: RebalancingAction[]
  loading: boolean
}

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value)

export const RebalancingActions = ({ actions, loading }: RebalancingActionsProps) => {
  const filtered = actions.filter(a => a.action !== "HOLD")

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Портфель близок к оптимальному</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Ребалансировка</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Тикер</th>
              <th className="pb-2 font-medium">Действие</th>
              <th className="pb-2 text-right font-medium">Лотов</th>
              <th className="pb-2 text-right font-medium">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.ticker} className="border-b border-border/50 last:border-0">
                <td className="py-2 font-medium">{a.ticker}</td>
                <td className="py-2">
                  {a.action === "BUY" ? (
                    <span className="inline-flex items-center gap-1 text-green-500">
                      <ArrowUpCircle className="h-3.5 w-3.5" />
                      Купить
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <ArrowDownCircle className="h-3.5 w-3.5" />
                      Продать
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">{a.lots}</td>
                <td className="py-2 text-right">{formatRub(a.valueRub)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
