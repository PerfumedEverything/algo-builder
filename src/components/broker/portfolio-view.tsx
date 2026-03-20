"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react"

import type { Portfolio, PortfolioPosition } from "@/core/types"

type PortfolioViewProps = {
  portfolio: Portfolio
}

const formatMoney = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const formatPrice = (n: number) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatPercent = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`

const formatSignedMoney = (n: number) =>
  `${n >= 0 ? "+" : ""}${formatMoney(n)}`

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

const yieldColor = (n: number) =>
  n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-muted-foreground"

const YieldIcon = ({ value, className }: { value: number; className?: string }) =>
  value >= 0
    ? <TrendingUp className={`${className} text-emerald-400`} />
    : <TrendingDown className={`${className} text-red-400`} />

const SummaryCard = ({ label, icon, children }: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
    {children}
  </div>
)

const AssetChip = ({ label, amount, total }: {
  label: string
  amount: number
  total: number
}) => {
  if (amount <= 0) return null
  const pct = total > 0 ? (amount / total) * 100 : 0
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatMoney(amount)}</span>
      <span className="text-muted-foreground">({pct.toFixed(1)}%)</span>
    </span>
  )
}

const PositionRow = ({ pos }: { pos: PortfolioPosition }) => {
  const [expanded, setExpanded] = useState(false)
  const hasOps = pos.operations.length > 0

  return (
    <div className="border-b border-border/50 last:border-0">
      <div
        className={`grid grid-cols-8 gap-2 py-2.5 text-sm ${hasOps ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={() => hasOps && setExpanded(!expanded)}
      >
        <div className="col-span-1 flex items-center gap-1">
          {hasOps && (
            expanded
              ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <span className="font-medium">{pos.ticker}</span>
            <p className="truncate text-xs text-muted-foreground">{pos.name}</p>
          </div>
        </div>
        <span className="text-right tabular-nums">{pos.quantity}</span>
        <span className="text-right tabular-nums">{formatPrice(pos.averagePrice)}</span>
        <span className="text-right tabular-nums">{formatPrice(pos.currentPrice)}</span>
        <span className="text-right tabular-nums">{formatMoney(pos.currentValue)}</span>
        <span className={`text-right tabular-nums font-medium ${yieldColor(pos.expectedYieldAbsolute)}`}>
          {formatSignedMoney(pos.expectedYieldAbsolute)}
        </span>
        <span className={`text-right tabular-nums font-medium ${yieldColor(pos.expectedYield)}`}>
          {formatPercent(pos.expectedYield)}
        </span>
        <div className="flex items-center justify-end gap-1">
          <YieldIcon value={pos.dailyYield} className="h-3 w-3" />
          <span className={`tabular-nums text-xs ${yieldColor(pos.dailyYield)}`}>
            {formatSignedMoney(pos.dailyYield)}
          </span>
        </div>
      </div>

      {expanded && pos.operations.length > 0 && (
        <div className="mb-2 ml-4 mr-2 rounded-lg bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            История операций ({pos.operations.length})
          </p>
          <div className="space-y-1">
            {pos.operations.map((op) => (
              <div key={op.id} className="flex items-center gap-3 text-xs">
                <div className={`flex items-center gap-1 ${op.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                  {op.type === "BUY"
                    ? <ArrowDownLeft className="h-3 w-3" />
                    : <ArrowUpRight className="h-3 w-3" />}
                  <span className="w-14 font-medium">{op.type === "BUY" ? "Покупка" : "Продажа"}</span>
                </div>
                <span className="w-20 text-right tabular-nums">{op.quantity} шт.</span>
                <span className="w-24 text-right tabular-nums">по {formatPrice(op.price)}</span>
                <span className="w-28 text-right tabular-nums">{formatMoney(op.amount)}</span>
                <span className="text-muted-foreground">{formatDate(op.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const PortfolioView = ({ portfolio }: PortfolioViewProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Стоимость портфеля" icon={<Wallet className="h-3.5 w-3.5" />}>
          <p className="text-xl font-bold">{formatMoney(portfolio.totalAmount)}</p>
        </SummaryCard>

        <SummaryCard label="Свободные средства" icon={<PiggyBank className="h-3.5 w-3.5" />}>
          <p className="text-xl font-bold">{formatMoney(portfolio.availableCash)}</p>
        </SummaryCard>

        <SummaryCard label="Общий P&L" icon={<BarChart3 className="h-3.5 w-3.5" />}>
          <p className={`text-xl font-bold ${yieldColor(portfolio.expectedYieldAbsolute)}`}>
            {formatSignedMoney(portfolio.expectedYieldAbsolute)}
          </p>
          <p className={`text-xs ${yieldColor(portfolio.expectedYield)}`}>
            {formatPercent(portfolio.expectedYield)}
          </p>
        </SummaryCard>

        <SummaryCard label="Дневной P&L" icon={<Clock className="h-3.5 w-3.5" />}>
          <p className={`text-xl font-bold ${yieldColor(portfolio.dailyYield)}`}>
            {formatSignedMoney(portfolio.dailyYield)}
          </p>
          <p className={`text-xs ${yieldColor(portfolio.dailyYieldRelative)}`}>
            {formatPercent(portfolio.dailyYieldRelative)}
          </p>
        </SummaryCard>
      </div>

      <div className="flex flex-wrap gap-2">
        <AssetChip label="Акции" amount={portfolio.totalShares} total={portfolio.totalAmount} />
        <AssetChip label="ETF" amount={portfolio.totalEtf} total={portfolio.totalAmount} />
        <AssetChip label="Облигации" amount={portfolio.totalBonds} total={portfolio.totalAmount} />
        <AssetChip label="Валюта" amount={portfolio.totalCurrencies} total={portfolio.totalAmount} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {portfolio.positions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет позиций</p>
        ) : (
          <>
            <div className="grid grid-cols-8 gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
              <span>Тикер</span>
              <span className="text-right">Кол-во</span>
              <span className="text-right">Ср. цена</span>
              <span className="text-right">Текущая</span>
              <span className="text-right">Стоимость</span>
              <span className="text-right">P&L ₽</span>
              <span className="text-right">P&L %</span>
              <span className="text-right">Дневной</span>
            </div>
            {portfolio.positions.map((pos) => (
              <PositionRow key={pos.instrumentId} pos={pos} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
