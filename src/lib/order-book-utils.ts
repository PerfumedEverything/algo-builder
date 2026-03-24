import type { OrderBookData, OrderBookLevel } from "@/core/types"

type RawOrder = {
  price?: { units: number; nano: number }
  quantity?: number
}

export const toNumber = (q?: { units?: number; nano?: number }): number => {
  if (!q) return 0
  return (q.units ?? 0) + (q.nano ?? 0) / 1_000_000_000
}

export const mapOrderBookResponse = (bids: RawOrder[], asks: RawOrder[]): OrderBookData => {
  const mapLevel = (o: RawOrder): OrderBookLevel => ({
    price: toNumber(o.price),
    quantity: o.quantity ?? 0,
  })

  const mappedBids = bids.map(mapLevel)
  const mappedAsks = asks.map(mapLevel)
  const spread = mappedAsks.length > 0 && mappedBids.length > 0
    ? mappedAsks[0].price - mappedBids[0].price
    : 0

  return { bids: mappedBids, asks: mappedAsks, spread }
}
