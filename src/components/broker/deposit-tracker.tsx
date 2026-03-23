"use client"

import { ArrowDownLeft } from "lucide-react"
import { calculateRealPnl } from "@/lib/deposit-calc"

type DepositTrackerProps = {
  totalDeposits: number
  totalWithdrawals: number
  portfolioValue: number
}

const formatMoney = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const formatPercent = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`

const yieldColor = (n: number) =>
  n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-muted-foreground"

export const DepositTracker = ({
  totalDeposits,
  totalWithdrawals,
  portfolioValue,
}: DepositTrackerProps) => {
  const { netDeposits, realPnl, realPnlPercent } = calculateRealPnl(
    totalDeposits,
    totalWithdrawals,
    portfolioValue,
  )

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowDownLeft className="h-3.5 w-3.5" />
        Пополнения
      </div>
      <p className="text-xl font-bold">{formatMoney(netDeposits)}</p>
      <p className={`text-xs ${yieldColor(realPnl)}`}>
        Реальная доходность: {formatPercent(realPnlPercent)}
      </p>
    </div>
  )
}
