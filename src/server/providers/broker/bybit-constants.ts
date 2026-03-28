export const BYBIT_CRYPTO_PAIRS = [
  { symbol: "BTCUSDT", name: "Bitcoin", category: "linear" as const },
  { symbol: "ETHUSDT", name: "Ethereum", category: "linear" as const },
  { symbol: "SOLUSDT", name: "Solana", category: "linear" as const },
  { symbol: "XRPUSDT", name: "XRP", category: "linear" as const },
  { symbol: "DOGEUSDT", name: "Dogecoin", category: "linear" as const },
  { symbol: "AVAXUSDT", name: "Avalanche", category: "linear" as const },
  { symbol: "ADAUSDT", name: "Cardano", category: "linear" as const },
  { symbol: "MATICUSDT", name: "Polygon", category: "linear" as const },
]

export const BYBIT_INTERVAL_MAP: Record<string, string> = {
  "1m": "1",
  "3m": "3",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "2h": "120",
  "4h": "240",
  "6h": "360",
  "12h": "720",
  "1d": "D",
  "1w": "W",
  "1M": "M",
}
