---
status: awaiting_human_verify
trigger: "Strategies show wrong entry/exit prices and RSI indicator values don't match TradingView. Anton reports strategies 'make up' numbers — this is a critical trust issue blocking the product."
created: 2026-03-26T00:00:00Z
updated: 2026-03-26T00:20:00Z
---

## Current Focus

hypothesis: CONFIRMED — 4 root causes found and fixed
test: All fixes applied, TypeScript check passes (no errors in modified files)
expecting: RSI values now match TradingView, entry prices match actual market price
next_action: Human verification — Anton should compare RSI on 5m SBER in TradingView vs our system

## Symptoms

expected: 1) Entry/exit prices match real market price at trigger moment. 2) RSI values match TradingView RSI for same instrument/timeframe/moment.
actual: 1) Notifications show entry price 316.40₽ for SBER while real price was ~316.65₽. 2) RSI-based strategy triggers at points that don't match TradingView RSI crossings.
errors: No error messages — silent incorrect values
reproduction: Create RSI-based strategy (e.g. "RSI crosses below 30" on SBER 5min), compare entry points with TradingView RSI indicator on same chart.
started: Has been like this since strategy implementation. Anton only recently compared against TradingView carefully.

## Eliminated

- hypothesis: technicalindicators RSI uses SMA instead of Wilder's smoothing
  evidence: AverageGain.js code confirms Wilder's smoothing: first period uses SMA, then uses ((avgGain * (period-1)) + gain) / period — exactly Wilder's method
  timestamp: 2026-03-26T00:05:00Z

- hypothesis: Price fetched from getCurrentPrice is wrong
  evidence: getCurrentPrice uses LAST_PRICE_EXCHANGE type — the most accurate exchange last price. This is correct.
  timestamp: 2026-03-26T00:05:00Z

## Evidence

- timestamp: 2026-03-26T00:03:00Z
  checked: strategy-checker.ts checkStrategy() method
  found: checkStrategy() reads price from priceCache.getPrice() first. PRICE_TTL = 120 seconds. Price could be 2 minutes stale when cron checkAll() fires.
  implication: H1 CONFIRMED - explains 316.40 vs 316.65 discrepancy. Price was what it was ~2 min earlier.

- timestamp: 2026-03-26T00:04:00Z
  checked: tinkoff-provider.ts getCandles() return mapping
  found: candles.map() included ALL candles including incomplete ones (isComplete: false). The last candle in any interval is almost always the currently-forming, incomplete candle.
  implication: H2 ROOT CAUSE - RSI computed with partial current candle. TradingView only uses completed candles. This causes major divergence especially near candle close time.

- timestamp: 2026-03-26T00:05:00Z
  checked: strategy-checker.ts line 99, signal-checker.ts line 84
  found: Both files use `strategy.timeframe || "1d"` / `signal.timeframe || "1d"` as fallback. Any strategy saved without explicit timeframe uses DAILY candles for RSI calculation even if user is looking at 5m chart on TradingView.
  implication: H3 CONFIRMED - default "1d" causes complete mismatch when user expects intraday RSI.

- timestamp: 2026-03-26T00:06:00Z
  checked: tinkoff-invest-api generated types marketdata.d.ts
  found: HistoricCandle type has `isComplete: boolean` field. Default value is false.
  implication: The fix is to filter `.filter((c) => c.isComplete)` before returning candles.

- timestamp: 2026-03-26T00:07:00Z
  checked: signal-checker.ts checkSignal() and getConditionProgress()
  found: Same stale price cache pattern as strategy-checker — reads from 120s TTL cache instead of live price.
  implication: Fixed the same pattern in signal-checker for consistency.

## Resolution

root_cause: |
  4 bugs causing accuracy issues:
  1. INCOMPLETE CANDLES IN RSI (critical): tinkoff-provider.ts returned all candles including the currently-forming incomplete candle (isComplete: false). TradingView only uses completed candles for RSI. This caused the biggest RSI divergence.
  2. STALE PRICE IN checkAll() PATH: checkStrategy() / checkSignal() read price from Redis cache (TTL=120s). Explains 316.40 vs 316.65 — up to 2 minutes stale.
  3. DEFAULT TIMEFRAME "1d" (strategy-checker.ts:99, signal-checker.ts:84): Any strategy/signal without explicit timeframe used daily candles for all indicator calculations, completely mismatching what user sees on TradingView 5m chart.
  4. SAME STALE PRICE IN signal-checker getConditionProgress(): Same pattern as bug #2.

fix: |
  1. tinkoff-provider.ts getCandles(): Added .filter((c) => c.isComplete) before mapping
  2. strategy-checker.ts checkStrategy(): Removed cache read, always fetches fresh price via broker.getCurrentPrice()
  3. strategy-checker.ts: Changed `"1d"` default to `"5m"`
  4. signal-checker.ts fetchCandles(): Changed `"1d"` default to `"5m"`
  5. signal-checker.ts checkSignal() + getConditionProgress(): Removed cache read, always fetches fresh price

verification: TypeScript check passes — no errors in modified source files. Pre-existing test file errors unrelated.
files_changed:
  - src/server/providers/broker/tinkoff-provider.ts
  - src/server/services/strategy-checker.ts
  - src/server/services/signal-checker.ts
