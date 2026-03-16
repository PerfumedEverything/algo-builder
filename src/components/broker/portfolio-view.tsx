"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

import type { Portfolio } from "@/core/types"

type PortfolioViewProps = {
  portfolio: Portfolio
}

const formatMoney = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)

const formatPercent = (current: number, average: number) => {
  if (average === 0) return "0%"
  const pct = ((current - average) / average) * 100
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
}

export const PortfolioView = ({ portfolio }: PortfolioViewProps) => {
  const yieldPositive = portfolio.expectedYield >= 0

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Портфель</h2>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatMoney(portfolio.totalAmount)}</p>
          <p className={`text-sm font-medium ${yieldPositive ? "text-emerald-400" : "text-red-400"}`}>
            {yieldPositive ? "+" : ""}{formatMoney(portfolio.expectedYield)}
          </p>
        </div>
      </div>

      {portfolio.positions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Нет позиций</p>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-5 gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
            <span>Тикер</span>
            <span className="text-right">Кол-во</span>
            <span className="text-right">Ср. цена</span>
            <span className="text-right">Текущая</span>
            <span className="text-right">Доход</span>
          </div>
          {portfolio.positions.map((pos) => {
            const positive = pos.expectedYield >= 0
            return (
              <div key={pos.instrumentId} className="grid grid-cols-5 gap-2 py-2 text-sm">
                <div>
                  <span className="font-medium">{pos.ticker}</span>
                  <p className="text-xs text-muted-foreground">{pos.name}</p>
                </div>
                <span className="text-right">{pos.quantity}</span>
                <span className="text-right">{pos.averagePrice.toFixed(2)}</span>
                <span className="text-right">{pos.currentPrice.toFixed(2)}</span>
                <div className="flex items-center justify-end gap-1">
                  {positive ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className={`text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPercent(pos.currentPrice, pos.averagePrice)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
