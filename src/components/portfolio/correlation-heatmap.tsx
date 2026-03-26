"use client"

import { Fragment, useState } from "react"
import type { CorrelationMatrix } from "@/core/types"

type CorrelationHeatmapProps = {
  matrix: CorrelationMatrix
  loading: boolean
  period: number
  onPeriodChange: (days: number) => void
}

const getColor = (value: number) => {
  if (value >= 0) {
    const g = Math.round(255 * (1 - value))
    return `rgb(${g}, 255, ${g})`
  }
  const r = Math.round(255 * (1 + value))
  return `rgb(255, ${r}, ${r})`
}

const getTextColor = (value: number) => {
  const abs = Math.abs(value)
  return abs > 0.5 ? "text-black" : "text-foreground"
}

export const CorrelationHeatmap = ({ matrix, loading, period, onPeriodChange }: CorrelationHeatmapProps) => {
  const [tooltip, setTooltip] = useState<{ a: string; b: string; corr: number } | null>(null)

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!matrix.tickers.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Нет данных для корреляции</p>
      </div>
    )
  }

  const { tickers, matrix: m, highPairs } = matrix
  const highSet = new Set(highPairs.map(p => `${p.a}:${p.b}`))

  const isHighCorr = (a: string, b: string) =>
    highSet.has(`${a}:${b}`) || highSet.has(`${b}:${a}`)

  return (
    <div className="relative overflow-auto rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Корреляционная матрица</h3>
        <select
          value={period}
          onChange={(e) => onPeriodChange(Number(e.target.value))}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value={30}>30 дней</option>
          <option value={60}>60 дней</option>
          <option value={90}>90 дней</option>
          <option value={180}>180 дней</option>
        </select>
      </div>
      {tooltip && (
        <div className="absolute top-2 right-2 z-10 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
          {tooltip.a} / {tooltip.b}: <span className="font-semibold">{tooltip.corr.toFixed(3)}</span>
        </div>
      )}
      <div
        className="grid"
        style={{ gridTemplateColumns: `auto repeat(${tickers.length}, 1fr)` }}
      >
        <div />
        {tickers.map(t => (
          <div key={t} className="px-1 py-0.5 text-center text-xs font-medium text-muted-foreground truncate">
            {t}
          </div>
        ))}
        {tickers.map((rowTicker, ri) => (
          <Fragment key={rowTicker}>
            <div className="flex items-center pr-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
              {rowTicker}
            </div>
            {tickers.map((colTicker, ci) => {
              const val = m[ri]?.[ci] ?? 0
              const isHigh = ri !== ci && isHighCorr(rowTicker, colTicker)
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={`m-0.5 flex cursor-pointer items-center justify-center rounded text-xs font-semibold transition-opacity hover:opacity-80 ${getTextColor(val)} ${isHigh ? "ring-2 ring-amber-400" : ""}`}
                  style={{ background: getColor(val), minHeight: 32, minWidth: 32 }}
                  onMouseEnter={() => setTooltip({ a: rowTicker, b: colTicker, corr: val })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {ri === ci ? "" : val.toFixed(2)}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
