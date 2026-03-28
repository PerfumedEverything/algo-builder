# Phase 14: Bybit Provider — Backend + Multi-broker - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 14-bybit-provider-backend
**Areas discussed:** SDK choice, Bybit scope, T-Invest refactor, crossover detection, MVP approach

---

## SDK Choice

| Option | Description | Selected |
|--------|-------------|----------|
| bybit-api | Direct Bybit SDK, TypeScript, 335 stars, auto-reconnect | ✓ |
| ccxt | Universal exchange lib, 41.5k stars, leaky abstraction for futures | |

**User's choice:** bybit-api
**Notes:** ccxt rejected due to leaky abstraction for perpetual futures, 5.6MB bundle, Bybit-specific params require hacks

---

## Bybit Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Spot only | Safer MVP, simpler | |
| Spot + Futures | Both from day one, futures P&L from API | ✓ |

**User's choice:** Spot + Futures
**Notes:** Anton wants futures. Bybit API returns all futures data ready-made (P&L, margin, liquidation) — no custom calculations needed. Key insight: futures are EASIER than spot for us because Bybit calculates everything.

---

## Testnet vs Production

| Option | Description | Selected |
|--------|-------------|----------|
| Testnet only | Safe development, switch to prod later | ✓ |
| Production | Real trading from start | |

**User's choice:** Testnet only (for now)

---

## Broker Switch Model

| Option | Description | Selected |
|--------|-------------|----------|
| One broker per user | Global switch, simpler | ✓ |
| Mixed strategies | Different brokers per strategy | |

**User's choice:** One broker per user

---

## T-Invest Refactor

| Option | Description | Selected |
|--------|-------------|----------|
| Keep custom FIFO | Current approach | |
| Use API data | averagePositionPriceFifo, expectedYieldFifo, OperationItem.yield | ✓ |

**User's choice:** Use API data wherever possible
**Notes:** User's rule #1 — ready-made solutions over custom code. Deep research revealed T-Invest API provides avg price (FIFO), realized P&L, unrealized P&L that we were calculating manually.

---

## Crossover Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Keep custom crossing-detector.ts | Current approach | |
| @ixjb94/indicators | Built-in crossover/crossunder functions, validated vs TradingView | ✓ |

**User's choice:** @ixjb94/indicators for crossover, keep trading-signals for indicators

---

## Indicator Library

| Option | Description | Selected |
|--------|-------------|----------|
| trading-signals (current) | Correct Wilder's WSMA, streaming, 199KB | ✓ |
| @ixjb94/indicators | 100+ indicators, batch-only | For crossover only |
| technicalindicators | 3k stars but last update 2023 | |
| talib-web | WASM TA-Lib port, maximum accuracy | Overkill |

**User's choice:** Keep trading-signals (it's correct), RSI mismatch was due to insufficient candle warmup, not library bug

---

## Claude's Discretion

- Internal BybitProvider class architecture
- Redis key naming for Bybit data
- Error handling for Bybit API failures
- Testnet config storage

## Deferred Ideas

- Phase 14.1: Bybit TradingView datafeed (blocked on TV license)
- @backtest-kit/pinets: Pine Script runtime for strategies (future consideration)
- ccxt: only if need 3+ exchanges later
