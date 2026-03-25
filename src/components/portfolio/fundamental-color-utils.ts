export const getMetricColor = (
  value: number | null,
  thresholds: { green: number; yellow: number; invert?: boolean },
): string => {
  if (value === null) return "text-muted-foreground"
  if (thresholds.invert) {
    if (value > thresholds.green) return "text-emerald-400"
    if (value > thresholds.yellow) return "text-yellow-400"
    return "text-red-400"
  }
  if (value < thresholds.green) return "text-emerald-400"
  if (value < thresholds.yellow) return "text-yellow-400"
  return "text-red-400"
}

export const getPeColor = (pe: number | null, sectorMedianPe: number): string =>
  getMetricColor(pe, { green: sectorMedianPe * 0.8, yellow: sectorMedianPe * 1.3 })

export const getPbColor = (pb: number | null): string =>
  getMetricColor(pb, { green: 1.0, yellow: 2.0 })

export const getDivYieldColor = (divYield: number | null): string =>
  getMetricColor(divYield, { green: 6, yellow: 3, invert: true })

export const getScoreColor = (score: number): string => {
  if (score <= 3) return "text-emerald-400"
  if (score <= 6) return "text-yellow-400"
  return "text-red-400"
}

export const getScoreLabel = (scoreLabel: "cheap" | "fair" | "expensive"): string => {
  const labels = { cheap: "Недооценён", fair: "Справедливая цена", expensive: "Переоценён" }
  return labels[scoreLabel]
}
