# Phase 14: Bybit Provider — Backend + Multi-broker - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Bybit as second broker (spot + perpetual futures) via `bybit-api` SDK. Multi-broker UI with T-Invest/Bybit switch. Refactor T-Invest to use API-provided data instead of custom calculations. Zero custom financial math for Bybit — all P&L, margin, liquidation from API.

</domain>

<decisions>
## Implementation Decisions

### D-01: SDK Choice — bybit-api (not ccxt)
- `bybit-api` v4.6.1 — official community SDK, TypeScript-native, 335 stars
- Full V5 API coverage: spot + linear perpetual futures
- WebSocket auto-reconnect + heartbeat built-in
- Testnet via `testnet: true` flag (one line)
- Rate limiting 400 req/s built-in
- ccxt rejected: leaky abstraction for futures, 5.6MB bundle, Bybit-specific params through hacks
- Multi-exchange later via separate adapters (same author has `binance-api`, `okx-api`)

### D-02: Bybit Scope — Spot + Perpetual Futures
- Both spot and USDT perpetual futures from day one
- Futures P&L, margin, liquidation price — ALL from Bybit API, zero custom calculations
- `getPositionInfo` returns: `unrealisedPnl`, `cumRealisedPnl`, `liqPrice`, `avgPrice`, `positionIM/MM`, `leverage`
- `getWalletBalance` returns: `totalEquity`, `totalPerpUPL`, `totalAvailableBalance`
- `getClosedPnL` returns: `closedPnl`, `openFee`, `closeFee` — net P&L = `closedPnl - openFee - closeFee` (1 line)
- No FIFO needed for Bybit — API handles everything
- Leverage management: `setLeverage`, `switchIsolatedMargin` — direct API calls

### D-03: Testnet-Only on Start
- Bybit testnet for safe testing, API identical to production
- Switch to mainnet = change one config flag later
- No risk of real money bugs during development

### D-04: Spot Instruments — Top Crypto Pairs
- Start with major pairs: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, etc.
- Hardcoded list initially, expandable later
- 8 decimal precision, USDT as quote currency
- 24/7 trading mode (no market hours)

### D-05: One Broker Per User (Global Switch)
- `brokerType` field in User table — `TINKOFF` (default) or `BYBIT`
- No mixed strategies across brokers — simplifies everything
- Switch changes all: portfolio, terminal, strategies, AI prompts
- DB migration: `ALTER TABLE "User" ADD COLUMN "brokerType" TEXT DEFAULT 'TINKOFF'`

### D-06: Separate Bybit WebSocket Worker
- New `bybit-stream-worker.ts` alongside existing `price-stream-worker.ts`
- Same Redis format: `price:{ticker}`, `candles:{ticker}:{timeframe}`
- `bybit-api` WebSocket client handles reconnect automatically
- Topics: `tickers` (price), `orderbook` (depth), `kline` (candles)
- Private topics: `position`, `order`, `execution`, `wallet`
- Note: `unrealisedPnl` changes do NOT trigger WebSocket events — need periodic polling (3-5s)

### D-07: T-Invest Refactor — Use API Data Instead of Custom Code
- **Remove FifoCalculator from getPortfolio()**: use `averagePositionPriceFifo` + `expectedYieldFifo` from API
- **Switch to getOperationsByCursor**: new API returns `OperationItem.yield` (realized P&L ready-made)
- **Use expectedYieldRelative**: instead of manual `yieldAbs / (total - yieldAbs) * 100`
- **Keep FifoCalculator only for**: lot-level breakdown table (API doesn't provide per-lot P&L)
- **Keep paper trading P&L**: internal DB records, no API equivalent

### D-08: Crossover Detection — @ixjb94/indicators
- Replace custom `crossing-detector.ts` crossover logic with `@ixjb94/indicators`
- Built-in functions: `crossover(a, b)`, `crossunder(a, b)`, `crossOverNumber(a, n)`, `crossUnderNumber(a, n)`
- Validated against TradingView data
- Keep `trading-signals` for streaming indicator calculation (correct Wilder's WSMA, matches TradingView with 200+ candles)

### D-09: AI Prompts for Crypto
- Add crypto ticker mappings (BTCUSDT, ETHUSDT, etc.) alongside RU tickers
- Adjust risk profiles for crypto volatility (higher % thresholds)
- Crypto-specific strategy suggestions (24/7, funding rate awareness)
- Conditional prompt selection based on user's `brokerType`

### D-10: Factory Pattern for Provider Selection
- `getBrokerProvider()` reads `brokerType` from user settings
- Returns `TinkoffProvider` or `BybitProvider` accordingly
- `BrokerAccount.type` enum: add `"BYBIT"` value
- `InstrumentType` enum: add `"CRYPTO"` value
- All downstream code (BrokerService, checkers, actions) works via interface — no broker-specific branches

### Claude's Discretion
- Internal architecture of `BybitBrokerProvider` class methods
- Redis key naming for Bybit-specific data
- Error handling strategy for Bybit API failures
- Testnet configuration storage approach
- Migration rollback strategy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Broker Architecture
- `src/server/providers/broker/types.ts` — BrokerProvider interface (8 methods)
- `src/server/providers/broker/tinkoff-provider.ts` — Reference implementation, getPortfolio FIFO logic (lines 100-203)
- `src/server/providers/broker/index.ts` — Factory function (hardcoded TinkoffProvider)
- `src/server/providers/broker/mock-broker-provider.ts` — Mock template for testing

### Services to Modify
- `src/server/services/broker-service.ts` — Orchestration layer, provider usage
- `src/server/services/fifo-calculator.ts` — To be removed from getPortfolio flow
- `src/server/services/operation-service.ts` — P&L calculations to simplify
- `src/server/services/crossing-detector.ts` — Crossover logic to replace with @ixjb94/indicators

### Workers
- `scripts/price-stream-worker.ts` — T-Invest price streaming (reference for Bybit worker)

### Types
- `src/core/types/broker.ts` — BrokerAccount, Portfolio, PortfolioPosition, Candle types
- `src/core/types/strategy.ts` — StrategyConfig, InstrumentType enum

### AI
- `src/server/providers/ai/ai-prompts.ts` — System prompts with RU-market tickers

### DB Schema
- `prisma/schema.prisma` — User model (needs brokerType), Strategy model (needs CRYPTO type)

### Config
- `src/server/repositories/broker-repository.ts` — Hardcodes brokerType: "TINKOFF"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BrokerProvider` interface — clean 8-method contract, Bybit just implements it
- `MockBrokerProvider` — good template for Bybit mock tests
- `candle-validator.ts` — `filterValidCandles` works for any broker's candles
- `@railpath/finance-toolkit` — risk metrics (Sharpe/VaR/etc) work on any return series
- `trading-signals` — indicator calculations are broker-agnostic

### Established Patterns
- Provider Pattern — external APIs behind abstraction (`BrokerProvider`, `AiProvider`)
- Service Layer — `BrokerService` wraps provider with auth/caching
- Server Actions — mutations via `try/catch -> ApiResponse<T>`
- Redis caching — `price:{ticker}`, `candles:{ticker}:{timeframe}` format

### Integration Points
- `getBrokerProvider()` factory — single swap point for multi-broker
- `BrokerRepository` — user settings storage (add `brokerType`)
- `price-stream-worker` — Redis pub/sub pattern to replicate for Bybit
- Strategy/Signal checkers — use `BrokerService` via interface, no broker-specific code

</code_context>

<specifics>
## Specific Ideas

### Bybit API Fields to Use Directly (No Custom Code)
- Position P&L: `unrealisedPnl`, `curRealisedPnl`, `cumRealisedPnl`
- Average price: `avgPrice`
- Margin: `positionIM`, `positionMM`
- Liquidation: `liqPrice`, `bustPrice`
- Portfolio: `totalEquity`, `totalWalletBalance`, `totalPerpUPL`
- Closed trades: `closedPnl`, `avgEntryPrice`, `avgExitPrice`
- Net P&L formula: `closedPnl - openFee - closeFee` (single line)

### T-Invest API Fields to Start Using
- `PortfolioPosition.averagePositionPriceFifo` — replaces FifoCalculator for aggregate avg
- `PortfolioPosition.expectedYieldFifo` — replaces custom unrealized P&L calc
- `PortfolioResponse.expectedYieldRelative` — replaces manual percentage formula
- `OperationItem.yield` (via getOperationsByCursor) — replaces manual realized P&L
- `PortfolioPosition.dailyYield` — already used, confirmed correct

### Crossover Detection Upgrade
- `@ixjb94/indicators`: `crossOverNumber(rsiArray, 30)` replaces custom comparison + lastValues persistence
- Batch-based (not streaming) — run on full candle history per check cycle
- Validated against TradingView data by library author

</specifics>

<deferred>
## Deferred Ideas

- **Phase 14.1**: Bybit TradingView Datafeed integration (blocked on TV license)
- **Phase 15**: Grid Trading (needs Bybit Provider from this phase)
- **Pine Script runtime**: `@backtest-kit/pinets` can run TradingView Pine Script v5/v6 in Node.js — potential future replacement for JSON condition engine
- **ccxt migration**: If need 3+ exchanges simultaneously, ccxt becomes worthwhile. Not for MVP.
- **T-Invest getTechAnalysis endpoint**: Returns RSI/MACD/BB/EMA/SMA from API, but missing ATR/Stochastic/VWAP/Williams%R (4 of 9 indicators) and doesn't work for Bybit. Not viable as replacement.

</deferred>

---

*Phase: 14-bybit-provider-backend*
*Context gathered: 2026-03-28*
