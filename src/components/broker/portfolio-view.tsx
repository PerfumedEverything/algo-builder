"use client"

import { useMemo, useState } from "react"
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
  Layers,
} from "lucide-react"

import type { Portfolio, PortfolioPosition } from "@/core/types"
import { DateRangeFilter, getRange } from "@/components/shared/date-range-filter"
import { LotAnalysisDialog } from "@/components/broker/lot-analysis-dialog"
import { DepositTracker } from "@/components/broker/deposit-tracker"
import { RiskMetricsSection } from "@/components/portfolio/risk-metrics-section"
import { FundamentalCard } from "@/components/portfolio/fundamental-card"

type PortfolioViewProps = {
  portfolio: Portfolio
  deposits?: { totalDeposits: number; totalWithdrawals: number }
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
  const [datePreset, setDatePreset] = useState("1y")
  const [dateFrom, setDateFrom] = useState(() => getRange("1y").from)
  const filteredOps = useMemo(
    () => pos.operations.filter((op) => new Date(op.date) >= dateFrom),
    [pos.operations, dateFrom],
  )
  const hasLots = (pos.lots?.length ?? 0) > 0
  const hasTicker = Boolean(pos.ticker && pos.ticker.trim().length > 0)
  const canExpand = pos.operations.length > 0 || hasLots || hasTicker

  return (
    <div className="border-b border-border/50 last:border-0">
      {/* Desktop row */}
      <div
        className={`hidden sm:grid grid-cols-8 gap-2 py-2.5 text-sm ${canExpand ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={() => canExpand && setExpanded(!expanded)}
      >
        <div className="col-span-1 flex items-center gap-1">
          {canExpand && (
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

      {/* Mobile card */}
      <div
        className={`sm:hidden py-3 ${canExpand ? "cursor-pointer" : ""}`}
        onClick={() => canExpand && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {canExpand && (
              expanded
                ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <span className="font-semibold text-sm">{pos.ticker}</span>
              <p className="truncate text-xs text-muted-foreground">{pos.name}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-medium tabular-nums">{formatMoney(pos.currentValue)}</p>
            <p className={`text-xs tabular-nums ${yieldColor(pos.dailyYield)}`}>
              {formatSignedMoney(pos.dailyYield)} день
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{pos.quantity} шт</span>
          <span>ср. {formatPrice(pos.averagePrice)}</span>
          <span>тек. {formatPrice(pos.currentPrice)}</span>
          <span className={`font-medium ${yieldColor(pos.expectedYieldAbsolute)}`}>
            {formatSignedMoney(pos.expectedYieldAbsolute)}
          </span>
          <span className={`font-medium ${yieldColor(pos.expectedYield)}`}>
            {formatPercent(pos.expectedYield)}
          </span>
        </div>
      </div>

      {expanded && hasLots && (() => {
        const lots = pos.lots!
        const totQty = lots.reduce((s, l) => s + l.remainingQuantity, 0)
        const totCost = lots.reduce((s, l) => s + l.buyPrice * l.remainingQuantity, 0)
        const totCurrent = lots.reduce((s, l) => s + l.currentPrice * l.remainingQuantity, 0)
        const totPnl = totCurrent - totCost
        const totPnlPct = totCost > 0 ? (totPnl / totCost) * 100 : 0
        const avgPrice = totQty > 0 ? totCost / totQty : 0

        return (
          <div className="mb-2 ml-4 mr-2 overflow-x-auto rounded-lg bg-accent/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Layers className="h-3 w-3" />
                Текущие лоты ({lots.length})
              </div>
              <LotAnalysisDialog
                ticker={pos.ticker}
                operations={pos.operations}
                currentPrice={pos.currentPrice}
              />
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 border-b border-border/30 pb-1 text-[10px] text-muted-foreground">
                <span>Дата</span>
                <span className="text-right">Цена покупки</span>
                <span className="text-right">Кол-во</span>
                <span className="text-right">Стоим. покупки</span>
                <span className="text-right">Текущая стоим.</span>
                <span className="text-right">P&L ₽</span>
                <span className="text-right">P&L %</span>
              </div>
              {lots.map((lot, i) => (
                <div key={i} className="grid grid-cols-7 gap-2 py-1 text-xs">
                  <span className="text-muted-foreground">{formatDate(lot.buyDate)}</span>
                  <span className="text-right tabular-nums">{formatPrice(lot.buyPrice)}</span>
                  <span className="text-right tabular-nums">{lot.remainingQuantity}</span>
                  <span className="text-right tabular-nums">{formatMoney(lot.buyPrice * lot.remainingQuantity)}</span>
                  <span className="text-right tabular-nums">{formatMoney(lot.currentPrice * lot.remainingQuantity)}</span>
                  <span className={`text-right tabular-nums font-medium ${yieldColor(lot.pnl)}`}>
                    {formatSignedMoney(lot.pnl)}
                  </span>
                  <span className={`text-right tabular-nums ${yieldColor(lot.pnlPercent)}`}>
                    {formatPercent(lot.pnlPercent)}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-7 gap-2 border-t border-border/30 pt-1 text-xs font-medium">
                <span>Итого</span>
                <span className="text-right tabular-nums">{formatPrice(avgPrice)}</span>
                <span className="text-right tabular-nums">{totQty}</span>
                <span className="text-right tabular-nums">{formatMoney(totCost)}</span>
                <span className="text-right tabular-nums">{formatMoney(totCurrent)}</span>
                <span className={`text-right tabular-nums ${yieldColor(totPnl)}`}>
                  {formatSignedMoney(totPnl)}
                </span>
                <span className={`text-right tabular-nums ${yieldColor(totPnlPct)}`}>
                  {formatPercent(totPnlPct)}
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {expanded && pos.operations.length > 0 && (
        <div className="mb-2 ml-4 mr-2 rounded-lg bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              История операций ({filteredOps.length})
            </p>
            <DateRangeFilter
              value={datePreset}
              onChange={(v, range) => { setDatePreset(v); setDateFrom(range.from) }}
            />
          </div>
          {filteredOps.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">Нет операций за выбранный период</p>
          ) : (
            <div className="space-y-1">
              {filteredOps.map((op) => (
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
          )}
        </div>
      )}

      {expanded && hasTicker && (
        <FundamentalCard
          ticker={pos.ticker}
          currentPrice={pos.currentPrice ?? pos.averagePrice ?? 0}
        />
      )}
    </div>
  )
}

export const PortfolioView = ({ portfolio, deposits }: PortfolioViewProps) => {
  const pnlAbs = portfolio.positions.reduce((s, p) => s + p.expectedYieldAbsolute, 0)
  const totalCost = portfolio.positions.reduce((s, p) => s + p.averagePrice * p.quantity, 0)
  const pnlPct = totalCost > 0 ? (pnlAbs / totalCost) * 100 : 0
  const dailyAbs = portfolio.positions.reduce((s, p) => s + p.dailyYield, 0)
  const dailyPct = totalCost > 0 ? (dailyAbs / totalCost) * 100 : 0

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
          <p className={`text-xl font-bold ${yieldColor(pnlAbs)}`}>
            {formatSignedMoney(pnlAbs)}
          </p>
          <p className={`text-xs ${yieldColor(pnlPct)}`}>
            {formatPercent(pnlPct)}
          </p>
        </SummaryCard>

        <SummaryCard label="Дневной P&L" icon={<Clock className="h-3.5 w-3.5" />}>
          <p className={`text-xl font-bold ${yieldColor(dailyAbs)}`}>
            {formatSignedMoney(dailyAbs)}
          </p>
          <p className={`text-xs ${yieldColor(dailyPct)}`}>
            {formatPercent(dailyPct)}
          </p>
        </SummaryCard>

        {deposits && (
          <DepositTracker
            totalDeposits={deposits.totalDeposits}
            totalWithdrawals={deposits.totalWithdrawals}
            portfolioValue={portfolio.totalAmount}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <AssetChip label="Акции" amount={portfolio.totalShares} total={portfolio.totalAmount} />
        <AssetChip label="ETF" amount={portfolio.totalEtf} total={portfolio.totalAmount} />
        <AssetChip label="Облигации" amount={portfolio.totalBonds} total={portfolio.totalAmount} />
        <AssetChip label="Валюта" amount={portfolio.totalCurrencies} total={portfolio.totalAmount} />
      </div>

      <div className="max-w-full overflow-hidden rounded-xl border border-border bg-card p-4">
        <div className="mb-3">
          <p className="text-sm font-medium">Позиции</p>
        </div>
        {portfolio.positions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет позиций</p>
        ) : (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="sm:min-w-[750px]">
              <div className="hidden sm:grid grid-cols-8 gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
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
            </div>
          </div>
        )}
      </div>

      <RiskMetricsSection />
    </div>
  )
}
