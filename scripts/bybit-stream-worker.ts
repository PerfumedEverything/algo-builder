import "dotenv/config"
import { WebsocketClient } from "bybit-api"
import Redis from "ioredis"
import { BYBIT_CRYPTO_PAIRS } from "../src/server/providers/broker/bybit-constants"

const PRICE_PREFIX = "price:"
const CANDLE_PREFIX = "candles:"
const ORDERBOOK_PREFIX = "orderbook:"
const PRICE_TTL = 120

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 500, 30000),
  reconnectOnError: (err: Error) => err.message.includes("READONLY") ? 2 : false,
})

redis.on("error", (err) => console.error("[BybitWorker] Redis error:", err.message))
redis.on("reconnecting", (delay: number) => console.log("[BybitWorker] Redis reconnecting in", delay, "ms"))

if (!process.env.BYBIT_API_KEY || !process.env.BYBIT_API_SECRET) {
  console.error("[BybitWorker] BYBIT_API_KEY and BYBIT_API_SECRET are required")
  process.exit(1)
}

const SYMBOLS = BYBIT_CRYPTO_PAIRS.map((p) => p.symbol)

const wsClient = new WebsocketClient({
  market: "v5",
  testnet: process.env.BYBIT_TESTNET !== "false",
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
})

wsClient.on("open", (data) => console.log("[BybitWorker] Connected:", data.wsKey))
wsClient.on("reconnect", (data) => console.log("[BybitWorker] Reconnecting:", data.wsKey))
wsClient.on("reconnected", (data) => console.log("[BybitWorker] Reconnected:", data.wsKey))
wsClient.on("exception", (err) => console.error("[BybitWorker] Error:", err))

wsClient.on("update", (data) => {
  const topic = data.topic as string | undefined
  if (!topic) return

  if (topic.startsWith("tickers.")) {
    const symbol = topic.replace("tickers.", "")
    const price = parseFloat(data.data.lastPrice)
    if (isNaN(price)) return
    redis.set(`${PRICE_PREFIX}${symbol}`, JSON.stringify({ price, updatedAt: Date.now() }), "EX", PRICE_TTL)
    redis.publish("price-updates", JSON.stringify({ instrumentId: symbol, price, timestamp: Date.now() }))
  }

  if (topic.startsWith("orderbook.")) {
    const symbol = topic.split(".")[2]
    redis.set(`${ORDERBOOK_PREFIX}${symbol}`, JSON.stringify(data.data), "EX", PRICE_TTL)
  }

  if (topic.startsWith("kline.")) {
    const parts = topic.split(".")
    const symbol = parts[2]
    const interval = parts[1]
    const candle = (data.data as Array<Record<string, string>>)[0]
    if (candle?.confirm) {
      redis.lpush(
        `${CANDLE_PREFIX}${symbol}:${interval}`,
        JSON.stringify({
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume),
          time: new Date(parseInt(candle.start)),
        }),
      )
      redis.ltrim(`${CANDLE_PREFIX}${symbol}:${interval}`, 0, 999)
    }
  }
})

async function writeHeartbeat() {
  await redis.set("bybit-worker:heartbeat", Date.now().toString(), "EX", 300)
}

async function main() {
  await redis.connect()
  console.log("[BybitWorker] Redis connected")
  console.log(`[BybitWorker] Subscribing to ${SYMBOLS.length} symbols on ${process.env.BYBIT_TESTNET !== "false" ? "testnet" : "mainnet"}`)

  for (const symbol of SYMBOLS) {
    wsClient.subscribeV5(`tickers.${symbol}`, "linear")
    wsClient.subscribeV5(`orderbook.1.${symbol}`, "linear")
    wsClient.subscribeV5(`kline.1.${symbol}`, "linear")
  }

  await writeHeartbeat()
  setInterval(() => writeHeartbeat(), 30_000)

  console.log("[BybitWorker] Ready. Listening for price updates...")
}

process.on("SIGTERM", async () => {
  console.log("[BybitWorker] Shutting down...")
  wsClient.closeAll()
  await redis.quit()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("[BybitWorker] Shutting down...")
  wsClient.closeAll()
  await redis.quit()
  process.exit(0)
})

main().catch((err) => {
  console.error("[BybitWorker] Fatal:", err)
  process.exit(1)
})
