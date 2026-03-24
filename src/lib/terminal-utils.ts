const priceFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const intFormatter = new Intl.NumberFormat("ru-RU")

export const formatPrice = (value: number): string => {
  return priceFormatter.format(value)
}

export const formatVolume = (value: number): string => {
  if (value === 0) return "0"
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    const formatted = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(m)
    return `${formatted}M`
  }
  if (value >= 10_000) {
    const k = Math.floor(value / 1_000)
    return `${k}K`
  }
  return intFormatter.format(value)
}

export const formatChange = (value: number): string => {
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)
  if (value > 0) return `+${formatted}%`
  if (value < 0) return `-${formatted}%`
  return `${formatted}%`
}

export const formatSpread = (value: number): string => {
  return priceFormatter.format(value)
}

export const getChangeColor = (value: number): string => {
  if (value > 0) return "text-emerald-500"
  if (value < 0) return "text-red-500"
  return "text-muted-foreground"
}
