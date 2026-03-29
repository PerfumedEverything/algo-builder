"use client"

import { useEffect, useRef } from "react"
import type { IChartApi, ISeriesApi, IPriceLine } from "lightweight-charts"
import { LineStyle } from "lightweight-charts"

type GridLevelItem = {
  price: number
  side: 'BUY' | 'SELL'
  status: 'PENDING' | 'FILLED' | 'CANCELLED'
  index?: number
}

type UseGridLevelsOverlayProps = {
  chartRef: React.RefObject<IChartApi | null>
  seriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>
  levels: GridLevelItem[]
  enabled: boolean
}

const LEVEL_COLORS: Record<string, string> = {
  FILLED: '#26a69a',
  SELL_PENDING: '#ef5350',
  BUY_PENDING: '#1976d2',
  CANCELLED: '#757575',
}

function getLevelColor(level: GridLevelItem): string {
  if (level.status === 'FILLED') return LEVEL_COLORS.FILLED
  if (level.status === 'CANCELLED') return LEVEL_COLORS.CANCELLED
  return level.side === 'SELL' ? LEVEL_COLORS.SELL_PENDING : LEVEL_COLORS.BUY_PENDING
}

export const useGridLevelsOverlay = ({
  chartRef,
  seriesRef,
  levels,
  enabled,
}: UseGridLevelsOverlayProps) => {
  const priceLineRefs = useRef<IPriceLine[]>([])

  const clearPriceLines = () => {
    if (!seriesRef.current) return
    for (const line of priceLineRefs.current) {
      try {
        seriesRef.current.removePriceLine(line)
      } catch {}
    }
    priceLineRefs.current = []
  }

  useEffect(() => {
    if (!seriesRef.current || !enabled || levels.length === 0) {
      clearPriceLines()
      return
    }

    clearPriceLines()

    const newLines: IPriceLine[] = []
    levels.forEach((level, i) => {
      if (!seriesRef.current) return
      const idx = level.index ?? i
      const line = seriesRef.current.createPriceLine({
        price: level.price,
        color: getLevelColor(level),
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${level.side} #${idx}`,
      })
      newLines.push(line)
    })

    priceLineRefs.current = newLines

    return () => {
      clearPriceLines()
    }
  }, [levels, enabled, seriesRef])

  return { clearPriceLines }
}
