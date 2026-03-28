# Phase 14: Bybit Provider — Backend + Multi-broker - Research

**Researched:** 2026-03-28
**Domain:** Bybit REST/WebSocket integration, multi-broker architecture, T-Invest refactor
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** SDK — `bybit-api` v4.6.1, not ccxt. TypeScript-native, V5 API, built-in reconnect/heartbeat.
- **D-02:** Scope — spot + USDT perpetual futures. Bybit P&L (unrealisedPnl, cumRealisedPnl, liqPrice, avgPrice, positionIM/MM) ALL from API. No FIFO for Bybit.
- **D-03:** Testnet-only on start. Switch to mainnet = change one flag.
- **D-04:** Spot instruments — top crypto pairs (BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT). Hardcoded list, 8 decimal precision, USDT quote, 24/7.
- **D-05:** One broker per user. `brokerType` in User table — `TINKOFF` (default) or `BYBIT`. DB migration: `ALTER TABLE "User" ADD COLUMN "brokerType" TEXT DEFAULT 'TINKOFF'`.
- **D-06:** Separate `bybit-stream-worker.ts`. Same Redis format: `price:{ticker}`, `candles:{ticker}:{timeframe}`. `unrealisedPnl` changes → polling (3-5s), NOT WebSocket.
- **D-07:** T-Invest refactor — use `averagePositionPriceFifo` + `expectedYieldFifo` + `expectedYieldRelative` from API. Switch to `getOperationsByCursor`. FifoCalculator kept ONLY for per-lot breakdown table.
- **D-08:** Crossover detection — `@ixjb94/indicators` replaces custom `crossing-detector.ts`. `crossover(a,b)`, `crossunder(a,b)`, `crossOverNumber(a,n)`, `crossUnderNumber(a,n)`.
- **D-09:** AI prompts adapted for crypto (ticker mappings, higher % thresholds, 24/7 + funding rate awareness).
- **D-10:** Factory pattern — `getBrokerProvider()` reads `brokerType`, returns `TinkoffProvider` or `BybitProvider`. `BrokerAccount.type` += `"BYBIT"`. `InstrumentType` enum += `"CRYPTO"`.

### Claude's Discretion

- Internal architecture of `BybitBrokerProvider` class methods
- Redis key naming for Bybit-specific data
- Error handling strategy for Bybit API failures
- Testnet configuration storage approach
- Migration rollback strategy

### Deferred Ideas (OUT OF SCOPE)

- Phase 14.1: Bybit TradingView Datafeed (blocked on TV license)
- Phase 15: Grid Trading (needs this phase)
- `@backtest-kit/pinets` Pine Script runtime
- ccxt migration (if 3+ exchanges needed)
- T-Invest `getTechAnalysis` endpoint
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BYBIT-01 | `bybit-api` installed, `BybitBrokerProvider` implements `BrokerProvider` | RestClientV5 method signatures confirmed. 8-method interface mapped below. |
| BYBIT-02 | `getPortfolio()` returns USDT balance + open positions with unrealized P&L | `getWalletBalance` + `getPositionInfo` API fields confirmed. |
| BYBIT-03 | `getCandles()` returns OHLCV passing `validateOHLC` | `getKline` response format confirmed (array[7]). Needs manual mapping. |
| BYBIT-04 | `placeOrder()` places limit and market orders | `submitOrder` with `category`, `symbol`, `side`, `orderType`, `qty`, `price` confirmed. |
| BYBIT-05 | `cancelOrder()` cancels an order | `cancelOrder` method confirmed. |
| BYBIT-06 | Tests: mock Bybit API, each provider method tested | `MockBrokerProvider` template available. Pattern: mock RestClientV5 class. |
| BYBIT-07 | WebSocket ticker subscription — realtime prices | `subscribeV5('tickers.BTCUSDT', 'linear')` confirmed. |
| BYBIT-08 | WebSocket orderbook subscription | `subscribeV5('orderbook.1.BTCUSDT', 'linear')` confirmed. |
| BYBIT-09 | WebSocket auto-reconnect | bybit-api WebsocketClient handles reconnect automatically. |
| BYBIT-10 | Integration with price-stream-worker via Redis pub/sub | Worker pattern replicated from `price-stream-worker.ts`. Same Redis channel `price-updates`. |
| BYBIT-11 | T-Invest / Bybit switch in user settings | `brokerType` DB column + settings UI component. |
| BYBIT-12 | Bybit: crypto pairs, 24/7, 8 decimal, USDT | Hardcoded list, no MOEX market-hours checks needed. |
| BYBIT-13 | AI prompts adapted for crypto | SYSTEM_PROMPT + CHAT_SYSTEM_PROMPT need crypto sections. |
| BYBIT-14 | Bybit testnet support | `RestClientV5({ testnet: true })` + `WebsocketClient({ market: 'v5', testnet: true })`. |
</phase_requirements>

---

## Summary

Phase 14 adds Bybit as a second broker via the `bybit-api` SDK. The architecture extends the existing `BrokerProvider` interface with a new `BybitBrokerProvider` class. The factory function `getBrokerProvider()` is upgraded to read `brokerType` from the User table and return the correct provider. A separate `bybit-stream-worker.ts` handles Bybit WebSocket streams for realtime prices and candles, writing to the same Redis keys as the existing T-Invest worker.

The T-Invest refactor simplifies `getPortfolio()` by replacing `FifoCalculator` with API-native fields (`averagePositionPriceFifo`, `expectedYieldFifo`). The `getOperationsByCursor` migration replaces `getOperations` for realized P&L — `OperationItem.yield` is available in the SDK (confirmed in generated types). The crossover detection upgrade replaces custom `evaluateCrossing()` in `crossing-detector.ts` with `@ixjb94/indicators` batch functions.

**Primary recommendation:** Build in this order: DB migration → types expansion → BybitBrokerProvider → factory upgrade → Bybit WebSocket worker → T-Invest refactor → crossover upgrade → AI prompts → UI switch. Each layer is independently testable.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bybit-api | 4.6.1 | Bybit REST + WebSocket V5 API | TypeScript-native, official community SDK, auto-reconnect, testnet flag |
| @ixjb94/indicators | 1.2.4 | Crossover/crossunder detection | Validated vs TradingView, replaces custom crossing-detector.ts |

### Not Installing (Already Present)
| Library | Version | Purpose |
|---------|---------|---------|
| ioredis | 5.10.0 | Redis pub/sub for worker |
| tinkoff-invest-api | 7.0.1 | T-Invest (refactoring existing) |
| trading-signals | 7.4.3 | Streaming indicators (unchanged) |

**Installation:**
```bash
npm install bybit-api @ixjb94/indicators
```

**Version verification (confirmed against npm registry 2026-03-28):**
- `bybit-api`: 4.6.1 (latest) — confirmed
- `@ixjb94/indicators`: 1.2.4 (latest) — confirmed

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
src/server/providers/broker/
├── bybit-provider.ts        # New BybitBrokerProvider class
├── tinkoff-provider.ts      # Refactored (remove FifoCalculator from getPortfolio)
├── index.ts                 # getBrokerProvider() upgraded to read brokerType
├── types.ts                 # BrokerProvider interface (no changes needed)
└── mock-broker-provider.ts  # Unchanged

src/server/repositories/
└── broker-repository.ts     # Add brokerType read + bybitToken/bybitAccountId fields

src/core/types/
├── broker.ts                # BrokerAccount.type += "BYBIT", Portfolio += futures fields
└── strategy.ts              # InstrumentType enum += CRYPTO

scripts/
└── bybit-stream-worker.ts   # New Bybit WebSocket worker (mirrors price-stream-worker.ts)

prisma/schema.prisma         # User.brokerType, User.bybitApiKey, User.bybitApiSecret
```

### Pattern 1: BybitBrokerProvider Class Structure

**What:** Implements all 8 `BrokerProvider` methods using `RestClientV5`. Stores `RestClientV5` instance after `connect()`.
**When to use:** When `getBrokerProvider()` factory returns Bybit for this user.

```typescript
// Source: bybit-api v4.6.1 RestClientV5
import { RestClientV5 } from 'bybit-api'
import type { BrokerProvider } from './types'

export class BybitProvider implements BrokerProvider {
  private client: RestClientV5 | null = null

  async connect(token: string): Promise<void> {
    // token = "apiKey:apiSecret" format (split on first ":")
    const [key, secret] = token.split(':')
    this.client = new RestClientV5({ key, secret, testnet: true })
  }

  async disconnect(): Promise<void> {
    this.client = null
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    // Bybit unified account = single account, no sub-accounts in V5 default
    // Return fixed account with USDT balance from getWalletBalance
    const res = await this.ensureClient().getWalletBalance({ accountType: 'UNIFIED' })
    return [{ id: 'bybit-unified', name: 'Bybit Unified', type: 'BYBIT', openedDate: '' }]
  }
}
```

### Pattern 2: getPortfolio() for Bybit

**What:** Combines `getWalletBalance` (USDT balance) + `getPositionInfo` (open futures positions) into `Portfolio` type. All P&L numbers come directly from API fields.
**When to use:** Any time portfolio data is requested for a Bybit user.

```typescript
// Source: bybit-api v4.6.1, Bybit V5 API docs
async getPortfolio(accountId: string): Promise<Portfolio> {
  const client = this.ensureClient()

  const [walletRes, positionsRes] = await Promise.all([
    client.getWalletBalance({ accountType: 'UNIFIED' }),
    client.getPositionInfo({ category: 'linear', settleCoin: 'USDT' }),
  ])

  const account = walletRes.result.list[0]
  const totalEquity = parseFloat(account.totalEquity)
  const totalPerpUPL = parseFloat(account.totalPerpUPL)
  const availableBalance = parseFloat(account.totalAvailableBalance)

  const positions: PortfolioPosition[] = positionsRes.result.list.map((p) => {
    const quantity = parseFloat(p.size)
    const avgPrice = parseFloat(p.avgPrice)
    const currentPrice = parseFloat(p.markPrice)
    const unrealisedPnl = parseFloat(p.unrealisedPnl)
    const pnlPct = avgPrice > 0 ? (unrealisedPnl / (avgPrice * quantity)) * 100 : 0

    return {
      instrumentId: p.symbol,
      ticker: p.symbol,
      name: p.symbol,
      quantity,
      averagePrice: avgPrice,
      currentPrice,
      expectedYield: pnlPct,
      expectedYieldAbsolute: unrealisedPnl,
      dailyYield: 0,         // Not available in position endpoint
      currentValue: quantity * currentPrice,
      instrumentType: 'CRYPTO',
      blocked: false,
      blockedLots: 0,
      operations: [],
      lots: [],
    }
  })

  return {
    totalAmount: totalEquity,
    expectedYield: totalEquity > 0 ? (totalPerpUPL / totalEquity) * 100 : 0,
    expectedYieldAbsolute: totalPerpUPL,
    dailyYield: 0,
    dailyYieldRelative: 0,
    totalShares: 0,
    totalBonds: 0,
    totalEtf: 0,
    totalCurrencies: availableBalance,
    availableCash: availableBalance,
    positions,
  }
}
```

### Pattern 3: getCandles() for Bybit

**What:** Maps Bybit kline response (array format) to `Candle[]`. Kline returns arrays in reverse chronological order — must reverse before returning.
**Critical detail:** Bybit kline response is `string[][]` where each inner array is `[startTime, open, high, low, close, volume, turnover]`.

```typescript
// Source: Bybit V5 API docs /v5/market/kline
async getCandles(params: CandleParams): Promise<Candle[]> {
  const client = this.ensureClient()
  const category = params.instrumentId.endsWith('USDT') && /* is perp */ ? 'linear' : 'spot'

  const res = await client.getKline({
    category,
    symbol: params.instrumentId,
    interval: BYBIT_INTERVAL_MAP[params.interval],
    start: params.from.getTime(),
    end: params.to.getTime(),
    limit: 1000,
  })

  return res.result.list
    .reverse()  // API returns newest first, we need oldest first
    .map((c) => ({
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
      time: new Date(parseInt(c[0])),
    }))
}

const BYBIT_INTERVAL_MAP: Record<string, string> = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '2h': '120', '4h': '240', '6h': '360', '12h': '720',
  '1d': 'D', '1w': 'W', '1M': 'M',
}
```

### Pattern 4: placeOrder() / cancelOrder() for Bybit

```typescript
// Source: Bybit V5 API docs /v5/order/create-order
// BrokerProvider interface must be EXTENDED with placeOrder/cancelOrder
// These do NOT currently exist on BrokerProvider interface — need to add

async placeOrder(params: PlaceOrderParams): Promise<string> {
  const client = this.ensureClient()
  const res = await client.submitOrder({
    category: 'linear',   // or 'spot'
    symbol: params.symbol,
    side: params.side === 'BUY' ? 'Buy' : 'Sell',
    orderType: params.orderType === 'LIMIT' ? 'Limit' : 'Market',
    qty: String(params.quantity),
    price: params.price ? String(params.price) : undefined,
    timeInForce: 'GTC',
  })
  return res.result.orderId
}

async cancelOrder(orderId: string, symbol: string): Promise<void> {
  const client = this.ensureClient()
  await this.ensureClient().cancelOrder({
    category: 'linear',
    symbol,
    orderId,
  })
}
```

**IMPORTANT:** `BrokerProvider` interface currently has 8 methods and does NOT include `placeOrder` / `cancelOrder`. Phase 14 must add these methods to the interface AND to `TinkoffProvider` (as stubs throwing "not implemented for T-Invest in this phase").

### Pattern 5: Factory Upgrade — getBrokerProvider()

```typescript
// Source: existing src/server/providers/broker/index.ts
import { getBrokerType } from '@/server/repositories/broker-repository'

export const getBrokerProvider = async (userId: string): Promise<BrokerProvider> => {
  const brokerType = await getBrokerType(userId)
  if (brokerType === 'BYBIT') return new BybitProvider()
  return new TinkoffProvider()
}
```

**Breaking change:** `getBrokerProvider()` currently takes no params and is synchronous. Making it async and adding `userId` requires updating ALL callers:
- `broker-service.ts` — every method calls `getBrokerProvider()`
- Currently `BrokerService` creates provider at construction time: `private provider = getBrokerProvider()`

**Solution:** Move provider creation inside each `BrokerService` method, passing `userId`. Or lazy-initialize per user.

### Pattern 6: bybit-stream-worker.ts

**What:** Mirror of `price-stream-worker.ts`. Connects to Bybit WebSocket, writes prices/candles to same Redis keys.
**Critical differences from T-Invest worker:**
- No ticker→UID resolution needed (Bybit uses symbol directly: `BTCUSDT`)
- Topic format: `tickers.BTCUSDT` (not FIGIs)
- Private topics need API key/secret (from env vars)
- `unrealisedPnl` polling at 3-5s interval (not from WebSocket)
- Category must be specified: `'linear'` for perps, `'spot'` for spot

```typescript
// Source: bybit-api WebsocketClient
const wsClient = new WebsocketClient({
  market: 'v5',
  testnet: true,
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
})

wsClient.subscribeV5('tickers.BTCUSDT', 'linear')
wsClient.subscribeV5('kline.1.BTCUSDT', 'linear')

wsClient.on('update', (data) => {
  if (data.topic?.startsWith('tickers.')) {
    const symbol = data.topic.replace('tickers.', '')
    const price = parseFloat(data.data.lastPrice)
    redis.set(`price:${symbol}`, JSON.stringify({ price, updatedAt: Date.now() }), 'EX', 120)
    redis.publish('price-updates', JSON.stringify({ instrumentId: symbol, price, timestamp: Date.now() }))
  }
})
```

### Pattern 7: T-Invest getPortfolio() Refactor (D-07)

**Replace FifoCalculator with API fields:**

```typescript
// BEFORE (current code, lines 163-168 of tinkoff-provider.ts):
const ops = opsByFigi.get(p.figi) ?? []
const fifoSummary = FifoCalculator.calculateSummary(ops, currentPrice)
const averagePrice = fifoSummary.totalQuantity > 0 ? fifoSummary.avgPrice : apiAvgPrice

// AFTER (use averagePositionPriceFifo + expectedYieldFifo from API):
const avgPriceFifo = toNumber(p.averagePositionPriceFifo)
const yieldFifo = toNumber(p.expectedYieldFifo)
const averagePrice = avgPriceFifo > 0 ? avgPriceFifo : toNumber(p.averagePositionPrice)
```

**Replace manual yieldPct with expectedYieldRelative:**
- `PortfolioResponse.dailyYieldRelative` already used and confirmed correct
- For `expectedYieldPct`: use `toNumber(res.expectedYieldRelative)` when available (multiply by 100 if it's a fraction — verify units at runtime)

**Switch to getOperationsByCursor:**
```typescript
// BEFORE:
client.operations.getOperations({ accountId, from, to, state })
// response: { operations: Operation[] } where each op has figi, operationType, price, quantity, payment

// AFTER:
client.operations.getOperationsByCursor({
  accountId,
  from,
  to,
  operationTypes: [OperationType.OPERATION_TYPE_BUY, OperationType.OPERATION_TYPE_SELL],
  state: OperationState.OPERATION_STATE_EXECUTED,
})
// response: { hasNext: boolean, nextCursor: string, items: OperationItem[] }
// OperationItem fields: cursor, figi, instrumentUid, type, payment, price, quantity,
//   yield (realized P&L ready-made!), yieldRelative, date, state
```

**Pagination:** `getOperationsByCursor` uses cursor-based pagination. For portfolio use, one page (limit 1000) is sufficient for most accounts. Add loop only if `hasNext === true`.

### Pattern 8: Crossover Detection Upgrade (D-08)

**What:** Replace `evaluateCrossing()` in `crossing-detector.ts` with `@ixjb94/indicators` batch functions.
**API:** `crossOverNumber(series: number[], n: number): Promise<boolean[]>` — returns array where `result[last]` is the crossing status.

```typescript
// Source: @ixjb94/indicators v1.2.4
import { Indicators } from '@ixjb94/indicators'
const ta = new Indicators()

// Current approach (stateful, requires lastValues persistence):
evaluateCrossing('CROSSES_ABOVE', current, 30, 'RSI:period=14', lastValues)

// New approach (stateless, batch over full series):
const rsiValues = IndicatorCalculator.calculateRSISeries(candles, 14) // need series, not scalar
const crossResult = await ta.crossOverNumber(rsiValues, 30)
const isCrossing = crossResult[crossResult.length - 1]  // last element = current candle
```

**Key insight:** `@ixjb94/indicators` is batch-based, not streaming. It takes the full series and returns a result per candle. This replaces the `lastValues` state persistence in `crossing-detector.ts` — no more storing previous indicator values across check cycles.

**Required change to `IndicatorCalculator`:** Currently returns scalars (last value only). Need to add series methods that return `number[]` for use with `@ixjb94/indicators`. Example: `calculateRSISeries(candles, period): number[]`.

### Anti-Patterns to Avoid

- **Calculating Bybit P&L manually:** Never compute unrealisedPnl, cumRealisedPnl, or net P&L from raw trades. Use what the API returns.
- **Mixing broker credentials:** Bybit uses `apiKey:apiSecret` pair; T-Invest uses a single token. Never store them in the same DB column. Need `bybitApiKey` + `bybitApiSecret` separate from `brokerToken`.
- **Synchronous getBrokerProvider():** After upgrade to async, never call it synchronously — provider selection requires DB read for `brokerType`.
- **Kline array order:** Bybit returns candles newest-first. Forgetting to `.reverse()` breaks all indicator calculations silently.
- **Category mismatch:** Spot tickers (`BTCUSDT` on spot) and linear perps (`BTCUSDT` on linear) are different markets. Must pass correct `category` or get wrong prices/candles.
- **String prices:** All Bybit API numeric fields are strings (`"67234.50"`). Always `parseFloat()` before arithmetic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bybit REST calls | Custom HTTP client | `RestClientV5` from bybit-api | Rate limiting, auth signing, error parsing built-in |
| Bybit WebSocket reconnect | Manual reconnect loop | `WebsocketClient` from bybit-api | Auto-reconnect, heartbeat, subscription replay built-in |
| Crossover detection | `evaluateCrossing()` with lastValues state | `@ixjb94/indicators` `crossOverNumber()` | Stateless, TradingView-validated, handles edge cases |
| Bybit P&L calculations | FIFO for crypto positions | `getPositionInfo` fields directly | API provides exact values including funding, fees |
| T-Invest avg price | FifoCalculator aggregate | `averagePositionPriceFifo` from API | API FIFO matches broker's own FIFO exactly |
| T-Invest realized P&L | Custom buy/sell matching | `OperationItem.yield` from getOperationsByCursor | Broker-computed, handles all edge cases |

**Key insight:** Bybit and T-Invest both provide broker-computed P&L that accounts for fees, funding rates, and internal calculations we cannot replicate exactly. Custom math will always drift from broker's reported figures.

---

## Common Pitfalls

### Pitfall 1: BrokerService Provider Initialization
**What goes wrong:** `BrokerService` currently instantiates provider at class construction: `private provider = getBrokerProvider()`. After making `getBrokerProvider()` async and user-aware, this pattern breaks.
**Why it happens:** The factory was originally hardcoded to TinkoffProvider with no params.
**How to avoid:** Refactor `BrokerService` to create provider inside each method, or add `initProvider(userId)` async method called first. Simplest: move `getBrokerProvider(userId)` call inside each method body.
**Warning signs:** TypeScript errors on `this.provider = getBrokerProvider()` after signature change.

### Pitfall 2: Separate Credential Storage
**What goes wrong:** Storing Bybit `apiKey:apiSecret` in the existing `brokerToken` column causes conflicts — T-Invest token format is completely different.
**Why it happens:** Single-broker assumption in original DB schema.
**How to avoid:** Add `bybitApiKey TEXT` and `bybitApiSecret TEXT` columns separately in migration. `brokerToken` remains T-Invest only.
**Warning signs:** Connect fails with "invalid token" if T-Invest token is passed to Bybit client.

### Pitfall 3: Kline Array Reverse Order
**What goes wrong:** Bybit `getKline` returns newest-first. Using the array without `.reverse()` means indicator calculations operate on inverted time series, producing nonsense values.
**Why it happens:** Bybit API design decision (most recent data first for pagination efficiency).
**How to avoid:** Always `res.result.list.reverse()` before mapping to `Candle[]`. Add comment explaining why.
**Warning signs:** RSI/SMA values look plausible but diverge from expected; candle `time` values decrease instead of increase.

### Pitfall 4: WebSocket Category Requirement
**What goes wrong:** `WebsocketClient.subscribeV5(topic, category)` — missing `category` or wrong category silently fails or returns empty data.
**Why it happens:** V5 API separates spot/linear/inverse into different WebSocket streams.
**How to avoid:** For USDT perpetuals: `'linear'`. For spot: `'spot'`. Validate subscriptions in worker startup log.
**Warning signs:** No price updates for subscribed symbols; no error thrown.

### Pitfall 5: getOperationsByCursor Pagination
**What goes wrong:** `GetOperationsByCursorResponse` has `hasNext: boolean` and `nextCursor`. If an account has >1000 operations in the date range, the first call only returns the first page.
**Why it happens:** Cursor pagination replaces offset pagination.
**How to avoid:** Loop while `hasNext === true`, collecting all items. For portfolio display, 1 year of operations typically fits in one page.
**Warning signs:** Historical P&L totals don't match broker statement for accounts with heavy trading.

### Pitfall 6: InstrumentType.CRYPTO Missing
**What goes wrong:** `Portfolio.positions[].instrumentType` is typed as `"STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF"`. Bybit positions would need `"CRYPTO"`. Both `PortfolioPosition` type and Prisma `InstrumentType` enum need update.
**Why it happens:** Original schema only covers Russian securities.
**How to avoid:** Add `CRYPTO` to both: `src/core/types/broker.ts` PortfolioPosition.instrumentType union AND `prisma/schema.prisma` InstrumentType enum. Run migration.
**Warning signs:** TypeScript error when returning PortfolioPosition with `instrumentType: 'CRYPTO'`.

### Pitfall 7: unrealisedPnl WebSocket Gap
**What goes wrong:** Bybit WebSocket `tickers` topic updates on price changes but does NOT include updated `unrealisedPnl` for open positions. If the worker only uses WebSocket, P&L display stays stale.
**Why it happens:** Bybit WebSocket design — P&L updates are in private `position` topic only, and only on order fills (not continuous price movement).
**How to avoid:** Implement 3-5s polling of `getPositionInfo` for open position P&L updates. Store in Redis with short TTL: `pnl:{userId}:{symbol}`. Worker subscribes to private WebSocket AND polls.
**Warning signs:** Position P&L shows correct value only when user has a fill, not on continuous price movement.

---

## Code Examples

### RestClientV5 Initialization (Testnet)
```typescript
// Source: bybit-api v4.6.1 official docs
import { RestClientV5 } from 'bybit-api'

const client = new RestClientV5({
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
  testnet: true,   // Change to false for production — single line switch
})
```

### WebsocketClient Initialization
```typescript
// Source: bybit-api v4.6.1
import { WebsocketClient } from 'bybit-api'

const wsClient = new WebsocketClient({
  market: 'v5',
  testnet: true,
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
})

// Public topics
wsClient.subscribeV5('tickers.BTCUSDT', 'linear')
wsClient.subscribeV5('kline.1.BTCUSDT', 'linear')
wsClient.subscribeV5('orderbook.1.BTCUSDT', 'linear')

// Private topics (require key+secret)
wsClient.subscribeV5('position', 'linear')
wsClient.subscribeV5('order', 'linear')

wsClient.on('update', (data) => { /* handle */ })
wsClient.on('reconnect', () => { console.log('[Bybit WS] Reconnected') })
```

### getWalletBalance Fields Used
```typescript
// Source: Bybit V5 API docs (confirmed)
const res = await client.getWalletBalance({ accountType: 'UNIFIED' })
const account = res.result.list[0]
// Used fields:
// account.totalEquity          — total portfolio value in USD
// account.totalWalletBalance   — wallet balance
// account.totalAvailableBalance — available for trading/withdrawal
// account.totalPerpUPL         — unrealized P&L from all perps
```

### getPositionInfo Fields Used
```typescript
// Source: Bybit V5 API docs (confirmed)
const res = await client.getPositionInfo({ category: 'linear', settleCoin: 'USDT' })
// Per position (res.result.list[n]):
// p.symbol            — e.g. "BTCUSDT"
// p.side              — "Buy" | "Sell"
// p.size              — position size (string)
// p.avgPrice          — average entry price (string)
// p.markPrice         — current mark price (string)
// p.unrealisedPnl     — unrealized P&L (string)
// p.cumRealisedPnl    — cumulative realized P&L (string)
// p.liqPrice          — liquidation price (string)
// p.positionIM        — initial margin (string)
// p.positionMM        — maintenance margin (string)
// p.leverage          — leverage (string)
```

### getClosedPnL — Net P&L Formula
```typescript
// Source: CONTEXT.md D-02 (confirmed by Bybit API docs)
const res = await client.getClosedPnL({ category: 'linear', symbol: 'BTCUSDT' })
// Per trade (res.result.list[n]):
// t.closedPnl     — gross P&L
// t.openFee       — entry fee
// t.closeFee      — exit fee
// Net P&L = parseFloat(t.closedPnl) - parseFloat(t.openFee) - parseFloat(t.closeFee)
```

### T-Invest getOperationsByCursor Usage
```typescript
// Source: tinkoff-invest-api v7.0.1 generated types (confirmed in node_modules)
// OperationItem fields confirmed: figi, type, payment, price, quantity,
//   yield (MoneyValue), yieldRelative (Quotation), date

const res = await client.operations.getOperationsByCursor({
  accountId,
  from: yearAgo,
  to: new Date(),
  operationTypes: [OperationType.OPERATION_TYPE_BUY, OperationType.OPERATION_TYPE_SELL],
  state: OperationState.OPERATION_STATE_EXECUTED,
})

for (const item of res.items) {
  const realizedPnl = toNumber(item.yield)  // ready-made realized P&L per trade
  // item.figi, item.type, item.price, item.quantity, item.payment all available
}

// Pagination:
if (res.hasNext) {
  const nextPage = await client.operations.getOperationsByCursor({
    accountId, from, to, cursor: res.nextCursor
  })
}
```

### @ixjb94/indicators Crossover Usage
```typescript
// Source: @ixjb94/indicators v1.2.4 (async API confirmed)
import { Indicators } from '@ixjb94/indicators'
const ta = new Indicators()

// RSI crosses above 30 (oversold exit)
const rsiSeries: number[] = getRSISeries(candles, 14)  // full array
const crosses = await ta.crossOverNumber(rsiSeries, 30)
const isCrossAbove30 = crosses[crosses.length - 1]  // current candle result

// RSI crosses below 70 (overbought exit)
const crossesUnder = await ta.crossUnderNumber(rsiSeries, 70)
const isCrossBelow70 = crossesUnder[crossesUnder.length - 1]

// SMA crossover (golden cross)
const fastSMA = getSMASeries(candles, 9)
const slowSMA = getSMASeries(candles, 21)
const goldenCross = await ta.crossover(fastSMA, slowSMA)
const isGoldenCross = goldenCross[goldenCross.length - 1]
```

---

## DB Migration Plan

### Prisma Schema Changes
```prisma
// 1. User table — broker type + Bybit credentials
model User {
  // ... existing fields ...
  brokerType      String  @default("TINKOFF")   // "TINKOFF" | "BYBIT"
  bybitApiKey     String?                        // Bybit API key
  bybitApiSecret  String?                        // Bybit API secret (encrypt in prod)
}

// 2. InstrumentType enum — add CRYPTO
enum InstrumentType {
  STOCK
  BOND
  CURRENCY
  FUTURES
  ETF
  CRYPTO   // NEW
}

// 3. BrokerAccount.type — "BYBIT" value handled in TypeScript types, not Prisma enum
//    (BrokerAccount is a TS type, not a DB model — no Prisma change needed)
```

### Supabase SQL Migration
```sql
-- Migration 001: Add brokerType and Bybit credentials to User
ALTER TABLE "User" ADD COLUMN "brokerType" TEXT NOT NULL DEFAULT 'TINKOFF';
ALTER TABLE "User" ADD COLUMN "bybitApiKey" TEXT;
ALTER TABLE "User" ADD COLUMN "bybitApiSecret" TEXT;

-- Migration 002: Add CRYPTO to InstrumentType enum
ALTER TYPE "InstrumentType" ADD VALUE 'CRYPTO';
-- Note: Prisma migrate handles this, but if manual:
-- ALTER TYPE "InstrumentType" ADD VALUE 'CRYPTO' AFTER 'ETF';
```

### BrokerRepository Changes
```typescript
// Add brokerType, bybitApiKey, bybitApiSecret to getSettings query
async getSettings(userId: string): Promise<BrokerSettingsRow | null> {
  const { data } = await supabase
    .from('User')
    .select('brokerToken, brokerAccountId, brokerType, bybitApiKey, bybitApiSecret')
    .eq('id', userId)
    .single()
  // Return actual brokerType from DB instead of hardcoded 'TINKOFF'
}

// Add new methods:
async saveBrokerType(userId: string, brokerType: 'TINKOFF' | 'BYBIT'): Promise<void>
async saveBybitCredentials(userId: string, apiKey: string, apiSecret: string): Promise<void>
async getBrokerType(userId: string): Promise<'TINKOFF' | 'BYBIT'>
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Worker scripts | ✓ | 20.19.0 | — |
| npm | Package install | ✓ | 10.8.2 | — |
| bybit-api | BybitProvider | ✗ | 4.6.1 (to install) | — |
| @ixjb94/indicators | CrossoverDetector | ✗ | 1.2.4 (to install) | — |
| Redis (ioredis) | Stream worker | ✓ (installed) | 5.10.0 | — |
| Bybit testnet API | Testing | ✓ (public) | — | — |

**Missing dependencies with no fallback:**
- `bybit-api` — must install before implementing BybitProvider
- `@ixjb94/indicators` — must install before upgrading crossing-detector.ts

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts (inferred from package.json test script) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BYBIT-01 | BybitProvider implements all 8 BrokerProvider methods | unit | `npm test -- bybit-provider` | ❌ Wave 0 |
| BYBIT-02 | getPortfolio maps Bybit API to Portfolio type | unit | `npm test -- bybit-provider` | ❌ Wave 0 |
| BYBIT-03 | getCandles returns valid OHLCV, passes validateOHLC | unit | `npm test -- bybit-provider` | ❌ Wave 0 |
| BYBIT-04 | placeOrder calls submitOrder with correct params | unit | `npm test -- bybit-provider` | ❌ Wave 0 |
| BYBIT-05 | cancelOrder calls cancelOrder with orderId+symbol | unit | `npm test -- bybit-provider` | ❌ Wave 0 |
| BYBIT-06 | All provider methods covered via mocked RestClientV5 | unit | `npm test -- bybit-provider` | ❌ Wave 0 |
| BYBIT-07/08 | WebSocket subscriptions publish to Redis | integration | manual smoke test | ❌ manual |
| BYBIT-09 | Auto-reconnect | integration | manual smoke test | ❌ manual |
| BYBIT-10 | Worker writes price:{BTCUSDT} to Redis | integration | manual smoke test | ❌ manual |
| BYBIT-11 | getBrokerProvider returns BybitProvider for BYBIT users | unit | `npm test -- broker-factory` | ❌ Wave 0 |
| BYBIT-12 | getInstruments returns crypto pairs | unit | `npm test -- bybit-provider` | ❌ Wave 0 |
| BYBIT-13 | AI prompts contain crypto tickers | unit | `npm test -- ai-prompts` | ❌ Wave 0 |
| BYBIT-14 | RestClientV5 created with testnet:true | unit | `npm test -- bybit-provider` | ❌ Wave 0 |

### Mock Pattern for BybitProvider Tests
```typescript
// Pattern: mock RestClientV5, verify method calls and return value mapping
// Source: existing mock-broker-provider.ts as template

vi.mock('bybit-api', () => ({
  RestClientV5: vi.fn().mockImplementation(() => ({
    getWalletBalance: vi.fn().mockResolvedValue({
      result: { list: [{ totalEquity: '10000', totalPerpUPL: '150', totalAvailableBalance: '9000' }] }
    }),
    getPositionInfo: vi.fn().mockResolvedValue({ result: { list: [] } }),
  }))
}))
```

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/server/providers/broker/__tests__/bybit-provider.test.ts` — covers BYBIT-01 through BYBIT-06, BYBIT-12, BYBIT-14
- [ ] `src/server/providers/broker/__tests__/broker-factory.test.ts` — covers BYBIT-11
- [ ] `src/server/providers/ai/__tests__/ai-prompts.test.ts` — covers BYBIT-13

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getOperations` (T-Invest) | `getOperationsByCursor` | T-Invest API evolution | Returns `OperationItem.yield` (realized P&L ready-made), cursor pagination |
| FifoCalculator for avg price | `averagePositionPriceFifo` from API | T-Invest portfolio API update | API FIFO is more accurate than our calculator |
| Custom evaluateCrossing with lastValues | `@ixjb94/indicators` batch | This phase | Stateless, TradingView-validated |
| Single broker (TinkoffProvider hardcoded) | Factory pattern by brokerType | This phase | Multi-broker support |

---

## Open Questions

1. **BrokerProvider interface — placeOrder/cancelOrder**
   - What we know: Current interface has 8 methods; none are placeOrder/cancelOrder
   - What's unclear: Do we add to the interface now (breaking change for TinkoffProvider) or add as Bybit-only extension?
   - Recommendation: Add to interface with default implementation that throws `"not supported by this broker"`. Allows BYBIT-04/05 requirements without breaking T-Invest flow.

2. **T-Invest expectedYieldRelative units**
   - What we know: `PortfolioResponse.dailyYieldRelative` is confirmed used and working. `expectedYieldRelative` is in the same response object.
   - What's unclear: Is it a fraction (0.035) or percentage (3.5)? Cannot verify without live API call.
   - Recommendation: Check at runtime in first integration test. If fraction, multiply by 100. Add logging to detect.

3. **Bybit category detection for symbols**
   - What we know: Same symbol `BTCUSDT` exists on both spot and linear markets
   - What's unclear: How should getCandles/placeOrder know which category to use?
   - Recommendation: Use strategy `instrumentType` — `CRYPTO` with futures flag = `'linear'`, without = `'spot'`. Or: always use `'linear'` initially (per D-02: spot + perp both in scope).

4. **bybitApiSecret encryption**
   - What we know: `bybitApiSecret` will be stored in DB; CONTEXT.md says testnet-only on start
   - What's unclear: Should we encrypt at-rest now or defer to production migration?
   - Recommendation: For testnet phase, plain text is acceptable. Add TODO comment. Encrypt before mainnet switch.

---

## Sources

### Primary (HIGH confidence)
- bybit-api v4.6.1 npm registry — version confirmed
- Bybit V5 API docs (bybit-exchange.github.io) — `getWalletBalance`, `getPositionInfo`, `getKline`, `getTickers`, `placeOrder`, `cancelOrder` field names confirmed
- tinkoff-invest-api v7.0.1 generated types in node_modules — `OperationItem.yield`, `PortfolioPosition.averagePositionPriceFifo`, `PortfolioPosition.expectedYieldFifo`, `PortfolioResponse.dailyYieldRelative`, `getOperationsByCursor` all confirmed present
- bybit-api WebsocketClient source (github.com/tiagosiebler/bybit-api) — `subscribeV5`, `testnet` config, `on('update')` event
- Existing codebase (tinkoff-provider.ts, broker-service.ts, crossing-detector.ts, price-stream-worker.ts, schema.prisma, broker-repository.ts) — directly read

### Secondary (MEDIUM confidence)
- @ixjb94/indicators v1.2.4 — crossover/crossunder/crossOverNumber/crossUnderNumber confirmed to exist; exact return type (boolean[]) inferred from purpose but not directly verified from source
- Bybit V5 WebsocketClient GitHub source — subscription format and event names

### Tertiary (LOW confidence)
- expectedYieldRelative units (fraction vs percent) — unverified without live API call

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — bybit-api and @ixjb94/indicators versions confirmed from npm registry
- Architecture: HIGH — existing patterns clearly understood from codebase read; Bybit API fields confirmed from official docs
- Pitfalls: HIGH — kline reverse order and string prices confirmed from official docs; getBrokerProvider breaking change confirmed from codebase
- T-Invest field availability: HIGH — confirmed from node_modules generated types
- @ixjb94/indicators API exact return types: MEDIUM — function existence confirmed, boolean[] return type inferred

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (bybit-api is actively maintained; @ixjb94/indicators is stable)
