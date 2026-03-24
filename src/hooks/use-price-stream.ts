"use client"

import { useEffect, useRef, useState } from "react"
import type { PriceUpdate } from "@/core/types"

export const usePriceStream = (): Map<string, PriceUpdate> => {
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/prices/stream")
    esRef.current = es

    es.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as PriceUpdate
        setPrices((prev) => new Map(prev).set(data.instrumentId, data))
      } catch {
      }
    }

    return () => {
      es.close()
    }
  }, [])

  return prices
}
