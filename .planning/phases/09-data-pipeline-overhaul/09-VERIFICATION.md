---
phase: 09-data-pipeline-overhaul
verified: 2026-03-27T12:00:00Z
status: gaps_found
score: 7/8 must-haves verified
re_verification: false
gaps:
  - truth: "BacktestService can run a backtest on a strategy with historical MOEX candle data"
    status: failed
    reason: "BacktestService.runBacktest() throws 'Not implemented' unconditionally — the method exists but always throws, making actual backtesting impossible. This is documented as an intentional stub for Phase 9 scope, but DPIPE-03 requires backtesting to work on historical data."
    artifacts:
      - path: "src/server/services/backtest-service.ts"
        issue: "runBacktest() throws Error('Not implemented — requires backtest-kit Backtest API integration') — no actual backtest execution path exists"
      - path: "src/server/actions/backtest-actions.ts"
        issue: "runBacktestAction calls BacktestService.runBacktest() which always throws; entryConditions/exitConditions hardcoded to empty strings"
    missing:
      - "Implement BacktestService.runBacktest() body using backtest-kit Backtest.background() API or equivalent"
      - "Wire entryConditions/exitConditions from strategy config in runBacktestAction"
  - truth: "Indicator accuracy test suite verifies RSI/SMA/EMA against hardcoded TradingView reference values within 0.1% tolerance"
    status: partial
    reason: "The SBER_FIXTURE expected values are computed from the same mathematical formulas as IndicatorCalculator itself (self-consistency) rather than from live TradingView readings. The 'real SBER data vs TradingView' tests pass because both sides use the same algorithm — this validates internal consistency, not alignment with TradingView. DPIPE-02/DPIPE-08 require TradingView-validated reference values."
    artifacts:
      - path: "src/__tests__/indicator-accuracy.test.ts"
        issue: "SBER_FIXTURE.expected values are computed inline using standard math formulas identical to IndicatorCalculator — not captured from TradingView. The describe block 'real SBER data vs TradingView' is a misnomer; it tests self-consistency."
    missing:
      - "Capture actual RSI(14), SMA(20), EMA(20) values from TradingView for the SBER_FIXTURE 30-candle dataset and hardcode them as reference constants"
      - "Update SBER_FIXTURE.expected with live TradingView readings (not computed from the same formulas)"
human_verification:
  - test: "Terminal price bar shows correct daily H/L/Vol independent of chart period"
    expected: "Switching from 1h to 1d to 1w chart does not change the High/Low/Volume values in the price bar; values reflect the full trading day session"
    why_human: "Requires live browser testing with a real instrument selected on the terminal page"
  - test: "BacktestService stub does not cause unhandled errors in production"
    expected: "runBacktestAction returns an error response (not a 500) when called, since runBacktest throws"
    why_human: "Need to verify the try/catch in runBacktestAction correctly catches the NotImplementedError and returns errorResponse rather than crashing"
---

# Phase 09: Data Pipeline Overhaul Verification Report

**Phase Goal:** Replace abandoned indicator library with verified alternative, integrate backtesting engine, normalize MOEX candle data, fix terminal price bar, add candle caching — making all market data across the platform accurate and verifiable against TradingView

**Verified:** 2026-03-27T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | All 9 indicators produce numeric results using trading-signals library | VERIFIED | `indicator-calculator.ts` imports all 9 from `trading-signals`, uses streaming API with `isStable` guard and `Number()` conversion |
| 2 | technicalindicators package is fully removed from the project | VERIFIED | `grep -r "technicalindicators" src/` returns no matches; `package.json` has no `technicalindicators` entry |
| 3 | Strategy checker fetches 500+ candles for indicator warmup accuracy | VERIFIED | `getCandleRangeMs` in `strategy-checker.ts` line 24: 1m=7*DAY, 5m=14*DAY, 15m=30*DAY, 1h=60*DAY |
| 4 | MOEX candles are filtered to session boundaries (main 10:00-18:40 MSK, optional evening 19:05-23:50) | VERIFIED | `candle-normalizer.ts` exports `isInMoexSession` with `minuteOfDay >= 600 && < 1120` (main) and `>= 1145 && < 1430` (evening) |
| 5 | Historical candles are cached in Redis with incremental append | VERIFIED | `price-cache.ts` has `appendCandles` method with deduplication by timestamp; `CANDLE_TTL_MAP` has 1m=14400s, 5m=43200s, 15m=86400s, 1h=172800s |
| 6 | Terminal price bar shows daily session H/L/Vol regardless of selected chart period | VERIFIED (code) | `terminal/page.tsx` uses `dailyStats` state from `getDailySessionStatsAction`; no `lastCandle.high/low/volume` patterns remain; `sessionOpen` replaces `todayOpen` |
| 7 | BacktestService registers MOEX exchange schema with T-Invest slippage/fees | VERIFIED | `backtest-service.ts`: `CC_PERCENT_SLIPPAGE: 0.05`, `CC_PERCENT_FEE: 0.03`, `exchangeName: "tinkoff-moex"`; singleton guard `static initialized = false` |
| 8 | BacktestService can run a backtest on historical data | FAILED | `runBacktest()` unconditionally throws `Error("Not implemented")` — no actual backtest execution path |
| 9 | Indicator accuracy test suite verifies against TradingView reference values within 0.1% | PARTIAL | SBER_FIXTURE expected values are computed inline using the same formulas as IndicatorCalculator (self-consistent), not captured from live TradingView |
| 10 | Audit script generates markdown report with all 9 indicators OK | VERIFIED | `scripts/audit-indicators.ts` exists; `AUDIT-REPORT.md` generated with all 9 indicators showing OK and 3 cross-checks passing |

**Score:** 7/10 truths fully verified (8 pass at code level, 2 gaps)

---

## Required Artifacts

### Plan 09-01 (DPIPE-01, DPIPE-02)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/services/indicator-calculator.ts` | All 9 indicators via trading-signals | VERIFIED | 175 lines, `from "trading-signals"`, streaming API, `isStable`, `Number()`, `StochasticOscillator`, `.stochK` |
| `src/server/services/strategy-checker.ts` | 500+ candle warmup ranges | VERIFIED | `getCandleRangeMs` with 7/14/30/60 * DAY for 1m/5m/15m/1h |
| `src/__tests__/indicator-calculator.test.ts` | Unit tests with trading-signals | VERIFIED | `describe("500+ candle warmup accuracy")` present |

### Plan 09-02 (DPIPE-05, DPIPE-06)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/services/candle-normalizer.ts` | MOEX session filtering + UTC/MSK | VERIFIED | Exports `normalizeMoexCandles`, `utcToMsk`, `isInMoexSession`, `MSK_OFFSET_MS`, `moexSessionStartUtcHour` |
| `src/server/services/price-cache.ts` | Incremental append + warmup TTLs | VERIFIED | `appendCandles` method present; `CachedCandle` exported; `1m: 14400`, `5m: 43200`, `15m: 86400`, `1h: 172800` |
| `src/__tests__/candle-normalizer.test.ts` | Normalizer edge case tests | VERIFIED | Tests for Saturday/Sunday, main session, pre-market, evening session, `isInMoexSession`, `utcToMsk`, `MSK_OFFSET_MS` |

### Plan 09-03 (DPIPE-04)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/actions/chart-actions.ts` | `getDailySessionStatsAction` | VERIFIED | Action exists, calls `getCurrentUserId()`, fetches 1m candles from session start, uses `MSK_OFFSET_MS` from candle-normalizer, delegates to `aggregateSessionStats` |
| `src/server/services/session-stats.ts` | `aggregateSessionStats` pure helper | VERIFIED (extracted) | Extracted from chart-actions per Next.js "use server" constraint; exports `DailySessionStats` type and `aggregateSessionStats` |
| `src/app/(dashboard)/terminal/page.tsx` | Price bar using daily session stats | VERIFIED | Imports `getDailySessionStatsAction`, has `dailyStats` state, uses `dailyStats?.high/low/volume/sessionOpen` — no `lastCandle.high/low/volume` patterns |
| `src/__tests__/daily-session-stats.test.ts` | Unit tests for aggregation | VERIFIED | 7 tests: sessionOpen, high, low, volume, empty, single, 390-candle realistic session |

### Plan 09-04 (DPIPE-03)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/services/backtest-service.ts` | BacktestService with MOEX schema | STUB (partial) | Class exists with `initialize()`, `isInitialized()`, exchange schema registration — but `runBacktest()` always throws NotImplementedError |
| `src/server/actions/backtest-actions.ts` | `runBacktestAction` server action | WIRED (to stub) | Exists with `"use server"`, `getCurrentUserId()`, calls `BacktestService.runBacktest()` — but entryConditions/exitConditions hardcoded to `""` |
| `src/server/services/index.ts` | Barrel export for BacktestService | VERIFIED | `export { BacktestService } from "./backtest-service"` present |
| `src/__tests__/backtest-service.test.ts` | Unit tests for BacktestService | VERIFIED | 5 tests: config values, schema registration, idempotency, isInitialized — `vi.mock("backtest-kit")` present |

### Plan 09-05 (DPIPE-07, DPIPE-08)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/__tests__/indicator-accuracy.test.ts` | TradingView accuracy comparison | PARTIAL | 14 tests present; `makeRealisticCandles`, `SBER_FIXTURE`, `withinTolerance` all exist; structural checks valid; SBER_FIXTURE expected values are self-computed, not from live TradingView |
| `scripts/audit-indicators.ts` | Audit script with 9 indicators | VERIFIED | Imports `IndicatorCalculator`, generates `# Indicator Audit Report` with all 9 names, 3 cross-checks; `package.json` has `"audit:indicators"` script |
| `.planning/phases/09-data-pipeline-overhaul/AUDIT-REPORT.md` | Generated audit report | VERIFIED | Exists; all 9 indicators show OK; SMA manual cross-check, Bollinger middle, MACD histogram all pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `indicator-calculator.ts` | `trading-signals` | `import` | WIRED | Line 1: `import { RSI, SMA, EMA, MACD, BollingerBands, ATR, StochasticOscillator, VWAP, WilliamsR } from "trading-signals"` |
| `strategy-checker.ts` | `indicator-calculator.ts` | `getCandleRangeMs` | WIRED | Line 24 confirmed; extended ranges present |
| `candle-normalizer.ts` | `@/core/types/broker` | `Candle` type | WIRED | Line 1: `import { Candle } from "@/core/types/broker"` |
| `price-cache.ts` | `@/lib/redis` | Redis client | WIRED | Line 1: `import { redis } from "@/lib/redis"` |
| `chart-actions.ts` | `candle-normalizer.ts` | `MSK_OFFSET_MS` | WIRED | Line 6: `import { MSK_OFFSET_MS } from "@/server/services/candle-normalizer"` |
| `terminal/page.tsx` | `chart-actions.ts` | `getDailySessionStatsAction` | WIRED | Line 17 import confirmed; `setDailyStats(res.data)` at line 180+ |
| `backtest-service.ts` | `backtest-kit` | `import` | WIRED | Line 1: `import { addExchangeSchema, setConfig } from "backtest-kit"` |
| `backtest-service.ts` | `@/server/providers/broker` | `getBrokerProvider` | WIRED | Line 2: `import { getBrokerProvider } from "@/server/providers/broker"` |
| `backtest-actions.ts` | `backtest-service.ts` | `BacktestService.runBacktest` | WIRED (to stub) | Line 16: `BacktestService.runBacktest(...)` called — but target throws NotImplementedError |
| `indicator-accuracy.test.ts` | `indicator-calculator.ts` | `IndicatorCalculator` | WIRED | Line 2: `import { IndicatorCalculator } from "@/server/services/indicator-calculator"` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `terminal/page.tsx` price bar | `dailyStats` | `getDailySessionStatsAction` → `BrokerService.getCandles()` 1m interval | Yes — fetches from broker API, aggregates real OHLCV | FLOWING |
| `backtest-service.ts` `runBacktest()` | n/a | `BacktestService.runBacktest()` body | No — throws before any data is fetched | DISCONNECTED |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `technicalindicators` fully removed | `grep -r "technicalindicators" src/` | No output | PASS |
| `trading-signals` imported in indicator-calculator | File inspection | Line 1 confirmed | PASS |
| `getCandleRangeMs` uses 7*DAY for 1m | `grep "getCandleRangeMs" strategy-checker.ts` | `"1m": 7 * DAY` confirmed | PASS |
| `appendCandles` exists in PriceCache | File inspection | Lines 83-93 confirmed | PASS |
| `dailyStats` state in terminal page | `grep "dailyStats" terminal/page.tsx` | 4 matches confirmed | PASS |
| `runBacktest` is callable (even if stub) | File inspection | Method exists, throws NotImplementedError | PARTIAL |
| Audit report generated with all OK | AUDIT-REPORT.md inspection | 9/9 OK, 3 cross-checks pass | PASS |
| No `lastCandle.high/low/volume` in terminal | `grep "lastCandle\.high"` | No matches | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DPIPE-01 | 09-01 | Replace technicalindicators with trading-signals for all 9 indicators | SATISFIED | `indicator-calculator.ts` uses `trading-signals` for all 9; no `technicalindicators` in codebase |
| DPIPE-02 | 09-01 | Indicator values match TradingView within 0.1% using 500+ candle warmup | PARTIAL | Structural accuracy verified; SBER_FIXTURE uses self-consistent expected values, not live TradingView readings |
| DPIPE-03 | 09-04 | backtest-kit integrated for strategy backtesting on historical MOEX data | BLOCKED | Exchange schema registered with correct slippage/fees; `runBacktest()` always throws NotImplementedError — no actual backtesting possible |
| DPIPE-04 | 09-03 | Terminal price bar shows daily session values: % change, H/L, volume | SATISFIED | `getDailySessionStatsAction` fetches 1m candles since session open; terminal page uses `dailyStats` for all price bar values |
| DPIPE-05 | 09-02 | MOEX candle normalization utility handles UTC→MSK, session boundaries, weekends | SATISFIED | `candle-normalizer.ts` with all required exports and correct minute-of-day boundaries |
| DPIPE-06 | 09-02 | Historical candles cached in Redis with incremental updates and warmup-appropriate TTLs | SATISFIED | `appendCandles` with deduplication; TTLs: 1m=4h, 5m=12h, 15m=24h, 1h=48h |
| DPIPE-07 | 09-05 | Comprehensive test suite: indicator accuracy, normalization edge cases, cache hit/miss | SATISFIED | 14 accuracy tests, 12 normalizer tests, 4 cache tests, 7 session stats tests, 5 backtest tests, warmup accuracy tests |
| DPIPE-08 | 09-05 | Audit report documenting indicator values vs TradingView | PARTIAL | Audit report exists with all 9 OK; cross-checks pass; SBER fixture is self-consistent rather than TradingView-verified |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/server/services/backtest-service.ts` | 66 | `throw new Error("Not implemented — requires backtest-kit Backtest API integration")` | BLOCKER | `runBacktest()` cannot execute — any call to `runBacktestAction` will return an error response. DPIPE-03 goal unmet. |
| `src/server/actions/backtest-actions.ts` | 17-18 | `entryConditions: ""`, `exitConditions: ""` | BLOCKER | Even if `runBacktest()` were implemented, strategy conditions would be empty — no strategy signal logic wired |
| `src/__tests__/indicator-accuracy.test.ts` | 63-116 | SBER_FIXTURE expected values computed from same formulas as IndicatorCalculator | WARNING | Self-consistency check passes trivially; does not validate alignment with TradingView's actual output |

**Pre-existing failures (out of scope, documented in deferred-items.md):**
- `src/__tests__/moex-provider.test.ts` — 6 tests failing (pre-existing, not caused by Phase 9)
- `src/__tests__/operation-actions.test.ts` — 4 tests failing (pre-existing, not caused by Phase 9)

---

## Human Verification Required

### 1. Terminal Price Bar Live Behavior

**Test:** Open the terminal page in a browser, select a MOEX instrument (e.g., SBER), observe the price bar H/L/Vol values. Then switch the chart period from 1h to 1d to 1w.
**Expected:** The High/Low/Volume values in the price bar do NOT change when switching chart periods; they always reflect the full trading day session.
**Why human:** Requires a running application with live broker data; cannot verify chart period independence programmatically.

### 2. runBacktestAction Error Handling

**Test:** Call `runBacktestAction` from a UI or direct server action call and verify it returns a structured error response (not an unhandled exception / 500).
**Expected:** `{ success: false, error: "Not implemented — requires backtest-kit Backtest API integration" }` — the try/catch in `backtest-actions.ts` catches the thrown Error and returns `errorResponse()`.
**Why human:** The try/catch structure looks correct in code, but verifying the runtime behavior requires an actual server action call.

### 3. TradingView Indicator Alignment (DPIPE-02 / DPIPE-08)

**Test:** Open TradingView, navigate to MOEX:SBER 1h chart for the date range 2024-10-14 to 2024-10-17, read RSI(14), SMA(20), EMA(20) values at the last candle of the SBER_FIXTURE dataset (2024-10-17 09:00).
**Expected:** TradingView values are within 0.1% of the values produced by `IndicatorCalculator` on the same SBER_FIXTURE candles.
**Why human:** TradingView does not expose its indicator values via API; requires manual chart reading to obtain ground-truth reference values.

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — BacktestService.runBacktest() is a stub (DPIPE-03)**

The backtest integration infrastructure is correctly built: `backtest-kit` is installed, the `tinkoff-moex` exchange schema is registered with correct MOEX slippage (0.05%) and T-Invest fees (0.03%), the singleton initialization guard works, and `runBacktestAction` provides a properly auth-guarded call site. However, the `runBacktest()` method itself unconditionally throws `Error("Not implemented")`. DPIPE-03 requires backtesting to work on historical data — the goal of validating strategies before deployment cannot be achieved. The SUMMARY documents this as an intentional scope deferral, but it means the phase goal for DPIPE-03 is not met.

**Gap 2 — SBER_FIXTURE TradingView alignment not externally verified (DPIPE-02/DPIPE-08)**

The indicator accuracy test suite exists and passes — but the "real SBER data vs TradingView" describe block validates self-consistency rather than TradingView alignment. The SBER_FIXTURE.expected values are computed inline using the same Wilder smoothing and EMA formulas that `IndicatorCalculator` itself uses. These tests will pass even if the underlying library's results diverge from TradingView. The SUMMARY acknowledges that TradingView was unavailable at execution time. A human must read the actual TradingView values from the SBER 1h chart for the fixture date range and compare.

---

_Verified: 2026-03-27T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
