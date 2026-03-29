import type { GridDistribution } from '@/core/types/grid'

export function calculateGridLevels(
  lowerPrice: number,
  upperPrice: number,
  gridCount: number,
  distribution: GridDistribution = 'ARITHMETIC',
): number[] {
  if (gridCount < 2) return [lowerPrice, upperPrice]
  if (distribution === 'GEOMETRIC') {
    return Array.from({ length: gridCount }, (_, i) =>
      lowerPrice * Math.pow(upperPrice / lowerPrice, i / (gridCount - 1)),
    )
  }
  const step = (upperPrice - lowerPrice) / (gridCount - 1)
  return Array.from({ length: gridCount }, (_, i) => lowerPrice + step * i)
}
