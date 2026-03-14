export type InstrumentTypeConfig = {
  type: "STOCK" | "BOND" | "CURRENCY" | "FUTURES"
  label: string
  labelRu: string
}

export const INSTRUMENT_TYPES: InstrumentTypeConfig[] = [
  { type: "STOCK", label: "Stocks", labelRu: "Акции" },
  { type: "BOND", label: "Bonds", labelRu: "Облигации" },
  { type: "CURRENCY", label: "Currencies", labelRu: "Валюты" },
  { type: "FUTURES", label: "Futures", labelRu: "Фьючерсы" },
]

export const TIMEFRAMES = [
  { value: "1m", label: "1 min" },
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "1d", label: "1 day" },
  { value: "1w", label: "1 week" },
] as const
