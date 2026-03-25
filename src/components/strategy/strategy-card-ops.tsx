"use client"

import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import type { StrategyOperation } from "@/core/types"

type StrategyCardOpsProps = {
  operations: StrategyOperation[]
  loading: boolean
}

const formatAmount = (n: number) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const StrategyCardOps = ({ operations, loading }: StrategyCardOpsProps) => {
  if (loading) {
    return <div className="py-4 text-center text-xs text-muted-foreground">Загрузка...</div>
  }
  if (operations.length === 0) {
    return <div className="py-4 text-center text-xs text-muted-foreground">Нет операций</div>
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th className="px-1.5 py-1.5 text-left font-medium whitespace-nowrap">Тип</th>
          <th className="px-1.5 py-1.5 text-right font-medium whitespace-nowrap">Цена</th>
          <th className="px-1.5 py-1.5 text-right font-medium whitespace-nowrap">Кол</th>
          <th className="px-1.5 py-1.5 text-right font-medium whitespace-nowrap">Сумма</th>
          <th className="px-1.5 py-1.5 text-right font-medium whitespace-nowrap">Время</th>
        </tr>
      </thead>
      <tbody>
        {operations.map((op) => (
          <tr key={op.id} className="border-b border-border/50 last:border-0">
            <td className="px-1.5 py-1.5">
              <span className={`flex items-center gap-1 ${op.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                {op.type === "BUY" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {op.type === "BUY" ? "Покупка" : "Продажа"}
              </span>
            </td>
            <td className="px-1.5 py-1.5 text-right font-mono">{formatAmount(op.price)}</td>
            <td className="px-1.5 py-1.5 text-right font-mono">{op.quantity}</td>
            <td className="px-1.5 py-1.5 text-right font-mono whitespace-nowrap">{formatAmount(op.amount)} ₽</td>
            <td className="px-1.5 py-1.5 text-right text-muted-foreground whitespace-nowrap">{formatTime(op.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
