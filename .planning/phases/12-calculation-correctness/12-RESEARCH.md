# Phase 12: Корректность расчётов — Research

**Researched:** 2026-03-28
**Domain:** Financial calculations — FIFO P&L, backtest engine, portfolio analytics, OHLCV validation
**Confidence:** HIGH

## Summary

Phase 12 replaces custom calculation code with battle-tested libraries and completes the backtest engine's stub implementation. The codebase already has `trading-signals`, `backtest-kit`, and `simple-statistics` installed. Two new packages are required: `@railpath/finance-toolkit` (v0.5.4) for Sharpe/Sortino/VaR/drawdown/correlation, and `candlestick` (v1.0.2) for OHLCV pattern utils — though `candlestick` does NOT provide OHLC validation, so `validateOHLC` must be written as a pure utility function.

The most critical fix is `BacktestService.runBacktest()`: the `getSignal` callback currently always returns `"long"` regardless of conditions — entryConditions/exitConditions are parsed but never evaluated. The fix requires wiring `IndicatorCalculator` into `getSignal` so each candle evaluates the full condition set. The portfolio amounts bug (showing `strategy.risks.tradeAmount` budget instead of real `sum(BUY operations)`) was partially fixed in Phase 11 — `paper-portfolio-view.tsx` correctly uses `stats.initialAmount` and `totalInitial`, but the root cause must be verified in `OperationService.getStats()`.

**Primary recommendation:** Install `@railpath/finance-toolkit`, write `validateOHLC` utility (candlestick package is pattern-detection only — no OHLC validation), replace `risk-calculations.ts` functions with library calls, and implement real condition evaluation in `BacktestService.getSignal`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CALC-01 | Sharpe, Sortino, VaR, max drawdown via `@railpath/finance-toolkit` | Library confirmed on npm v0.5.4, exports: `calculateSharpeRatio`, `calculateSortinoRatio`, `calculateVaR`, `calculateMaxDrawdown` |
| CALC-02 | Correlation matrix via library function | `calculateCorrelationMatrix` in `@railpath/finance-toolkit` — input: `{ returns: number[][], labels?: string[] }` |
| CALC-03 | Library results match manual calculation on 3 test datasets | Standard unit tests comparing library output against known formulas |
| CALC-04 | `validateOHLC` on every candle before calculations | Must be written as custom pure utility (candlestick pkg is pattern-detection only) |
| CALC-05 | Broken candles logged and excluded | Logger + filter in `BrokerService.getCandles()` after validation |
| CALC-06 | Tests confirm 3 types of broken candles filtered | Unit test with fixture data: high < low, negative volume, future timestamp |
| CALC-07 | FifoCalculator 100% unit test coverage — 6 scenarios | Already ~14 tests exist, need gap analysis for exact 6 spec scenarios |
| CALC-08 | Average entry price correct across multiple entries | Already covered in `calculateSummary` tests |
| CALC-09 | Unrealized P&L correct on partial close | Already covered in existing tests |
| CALC-10 | `BacktestService.runBacktest()` parses entryConditions/exitConditions | JSON parse already done; evaluation stub needs implementation |
| CALC-11 | On each backtest candle — compute indicators, check conditions | `IndicatorCalculator` already has all required indicators |
| CALC-12 | Entry only when ALL entry conditions met; exit on ANY exit OR TP/SL | Logic gate implementation in `getSignal` callback |
| CALC-13 | Test: RSI<30 entry, RSI>70 exit on known data → correct entry/exit points | Need fixture candle data with known RSI values |
| CALC-14 | Portfolio size = sum(real BUY operations), not sum(strategy.budget) | `paper-portfolio-view.tsx` already uses `totalInitial` from `stats.initialAmount` — verify root |
| CALC-15 | Strategy card "Позиция" = initialAmount from operations | `strategy-card.tsx:131` uses `stats.currentAmount` not `initialAmount` — needs check |
| CALC-16 | P&L% = total P&L / total real invested × 100 | `paper-portfolio-view.tsx:92` already computes this correctly |
| CALC-17 | Test: budget 10000₽, real purchase 9780₽ → portfolio shows 9780₽ | `OperationService.getStats()` returns `initialAmount = totalBuyAmount` — verify |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@railpath/finance-toolkit` | 0.5.4 | Sharpe, Sortino, VaR, drawdown, correlation, beta | Confirmed on npm, TypeScript-native, Zod-validated inputs, covers all CALC-01/02 |
| `trading-signals` | 7.4.3 | RSI, SMA, EMA, MACD, Bollinger, ATR, Stochastic, VWAP, Williams R | Already installed, used by `IndicatorCalculator` |
| `backtest-kit` | 5.9.0 | Backtest runner framework | Already installed, BacktestService wraps it |
| `simple-statistics` | 7.8.9 | Low-level stats (mean, stddev, quantile) | Already installed, used by risk-calculations.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `candlestick` | 1.0.2 | Candlestick pattern detection utilities | Only for `bodyLen`, `wickLen`, `isBullish` helpers — NOT for OHLC validation |
| `vitest` | (installed) | Unit test runner | All financial calc tests |

### What `candlestick` does NOT have
The `candlestick` package provides pattern detection (hammer, engulfing, doji, etc.) and geometric utilities (`bodyLen`, `wickLen`, `tailLen`, `isBullish`, `isBearish`). It does NOT have `validateOHLC`. OHLC validation must be written as a custom pure function.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@railpath/finance-toolkit` | `simple-statistics` (already installed) | simple-statistics has mean/stddev/quantile but no Sharpe/Sortino/VaR/drawdown — toolkit required |
| `@railpath/finance-toolkit` | custom math | Spec explicitly mandates library — no custom allowed per CALC-01 |

**Installation:**
```bash
npm install @railpath/finance-toolkit candlestick
```

**Version verification (confirmed 2026-03-28):**
- `@railpath/finance-toolkit`: 0.5.4 (published, MIT, zod v4 dep)
- `candlestick`: 1.0.2 (published, MIT, no deps)

## Architecture Patterns

### Recommended Project Structure

No new directories required. Changes are in-place:
```
src/
├── server/services/
│   ├── risk-calculations.ts         # Replace sharpe/var95/maxDrawdown/correlation with library calls
│   ├── correlation-service.ts       # Replace sampleCorrelation loop with calculateCorrelationMatrix
│   ├── backtest-service.ts          # Replace getSignal stub with real condition evaluation
│   └── candle-validator.ts          # NEW: validateOHLC pure utility
├── server/providers/broker/
│   └── broker-service.ts            # Add validateOHLC call in getCandles()
└── __tests__/
    ├── candle-validator.test.ts      # NEW: 3 broken candle scenarios
    ├── risk-calculations.test.ts     # EXTEND: verify library output vs manual
    └── backtest-service.test.ts      # EXTEND: real condition evaluation tests
```

### Pattern 1: Replace risk-calculations.ts with @railpath/finance-toolkit

**What:** Replace the 5 custom functions (`sharpe`, `var95`, `maxDrawdown`, and inline correlation) with library calls.

**When to use:** CALC-01, CALC-02 — everywhere these metrics are computed.

**Library API (verified from extracted type definitions):**

```typescript
// Source: @railpath/finance-toolkit dist/index.d.ts

// SHARPE: input returns[] (daily), riskFreeRate (daily), annualizationFactor (default 252)
import { calculateSharpeRatio } from "@railpath/finance-toolkit"
const result = calculateSharpeRatio({ returns, riskFreeRate: 0.21 / 248, annualizationFactor: 248 })
// result.sharpeRatio, result.annualizedReturn, result.annualizedVolatility, result.excessReturn

// SORTINO: same shape but targetReturn instead of riskFreeRate
import { calculateSortinoRatio } from "@railpath/finance-toolkit"
const result = calculateSortinoRatio({ returns, riskFreeRate: 0.21 / 248, annualizationFactor: 248 })
// result.sortinoRatio, result.downsideDeviation

// VAR: takes returns[], confidenceLevel; method defaults to "historical"
import { calculateVaR, calculateVaR95 } from "@railpath/finance-toolkit"
const result = calculateVaR(returns, { confidenceLevel: 0.95 })
// result.value — the VaR amount; result.cvar optional
// OR convenience:
const var95Value = calculateVaR95(returns)  // returns number directly

// MAX DRAWDOWN: takes prices[] (not returns[]) — this is a breaking change vs current implementation
import { calculateMaxDrawdown } from "@railpath/finance-toolkit"
const result = calculateMaxDrawdown({ prices: closingPrices })
// result.maxDrawdownPercent, result.peakIndex, result.troughIndex, result.peakValue, result.troughValue

// CORRELATION MATRIX: takes returns[][] and optional labels
import { calculateCorrelationMatrix } from "@railpath/finance-toolkit"
const result = calculateCorrelationMatrix({ returns: [returnsA, returnsB, returnsC], labels: ["SBER", "GAZP", "LKOH"] })
// result.matrix (number[][]), result.labels, result.averageCorrelation
```

**CRITICAL DIFFERENCE — maxDrawdown input:** Current `risk-calculations.ts:maxDrawdown()` takes `returns[]`. The library `calculateMaxDrawdown` takes `prices[]` (closing prices, not returns). The current `RiskService` builds `cumulative` from returns internally. Must pass the raw closing prices array, not the returns array.

### Pattern 2: validateOHLC pure utility

**What:** A pure function that validates a single candle meets broker data integrity constraints.

**When to use:** Call in `BrokerService.getCandles()` before returning the array. Also call in backtest exchange schema's `getCandles`.

```typescript
// src/server/services/candle-validator.ts
import type { Candle } from "@/core/types"

export type ValidationResult = { valid: boolean; reason?: string }

export function validateOHLC(candle: Candle): ValidationResult {
  if (candle.high < candle.low) return { valid: false, reason: "high < low" }
  if (candle.high < candle.open || candle.high < candle.close)
    return { valid: false, reason: "high < open|close" }
  if (candle.low > candle.open || candle.low > candle.close)
    return { valid: false, reason: "low > open|close" }
  if (candle.volume < 0) return { valid: false, reason: "negative volume" }
  if (candle.time > new Date()) return { valid: false, reason: "future timestamp" }
  return { valid: true }
}

export function filterValidCandles(candles: Candle[]): Candle[] {
  return candles.filter((c) => {
    const result = validateOHLC(c)
    if (!result.valid) {
      console.warn(`[CandleValidator] Broken candle filtered: ${result.reason}`, c)
    }
    return result.valid
  })
}
```

### Pattern 3: BacktestService real condition evaluation

**What:** Replace `getSignal` stub with real indicator evaluation using `IndicatorCalculator`.

**Current problem (line 114-121 in backtest-service.ts):**
```typescript
// STUB — always returns long regardless of conditions
getSignal: async (_symbol: string, _when: Date) => {
  return {
    position: "long" as const,
    priceTakeProfit: 1 + tpPct / 100,
    priceStopLoss: 1 - slPct / 100,
    minuteEstimatedTime: Infinity,
  }
},
```

**Fix approach:** `backtest-kit`'s `getSignal(symbol, when)` receives the current timestamp. The exchange schema already fetches candles via `getCandles`. The `getSignal` stub needs to:
1. Fetch a window of candles up to `when` (sufficient for indicator warmup, ~500 bars)
2. Run `IndicatorCalculator` on those candles
3. Evaluate each condition in `entryPayload.conditions` against computed indicator values
4. Return `"long"` only when ALL entry conditions pass (AND logic), null/flat otherwise
5. Exit position when ANY exit condition passes OR TP/SL triggered

**Condition evaluation logic (mirrors SignalChecker pattern):**
```typescript
// Same logic already used in strategy-checker.ts / signal-checker.ts
function evaluateCondition(
  indicatorValue: number,
  condition: ConditionType,
  value: number,
  valueTo?: number
): boolean {
  switch (condition) {
    case "GREATER_THAN": return indicatorValue > value
    case "LESS_THAN": return indicatorValue < value
    case "BETWEEN": return indicatorValue >= value && indicatorValue <= (valueTo ?? value)
    // ... etc
  }
}
```

**Key insight:** The project already has condition evaluation logic in `strategy-checker.ts` and `signal-checker.ts`. Extract it to a shared utility (`evaluate-condition.ts`) and reuse in both `BacktestService` and the live signal path.

### Pattern 4: Portfolio amounts — verify Phase 11 fix

**What:** Confirm `stats.initialAmount` = sum of real BUY operation amounts, not `config.risks.tradeAmount`.

**Current state (verified in code):**
- `OperationService.getStats()` line 84: `initialAmount: totalBuyAmount` — this is `sum(op.amount)` for all BUY ops. CORRECT.
- `paper-portfolio-view.tsx` line 91: `totalInitial = rows.reduce((s, r) => s + r.stats.initialAmount, 0)`. CORRECT.
- `strategy-card.tsx` line 131: `stats.currentAmount` is shown as "Позиция" — this is `holdingQty * currentPrice`, not `initialAmount`. This means "Позиция" shows current market value, not cost basis. Per CALC-15, it should show `initialAmount`.

**CALC-15 fix needed:** `strategy-card.tsx` must show `stats.initialAmount` (the actual invested amount) rather than `stats.currentAmount` (current mark-to-market) as the "Позиция" label.

### Anti-Patterns to Avoid
- **Passing returns[] to calculateMaxDrawdown:** Library takes prices[], not returns[]. Passing returns gives wrong result.
- **Using candlestick package for OHLC validation:** The package is for pattern detection only. Write `validateOHLC` as a custom function.
- **Re-implementing condition evaluation:** The logic already exists in `signal-checker.ts`/`strategy-checker.ts`. Extract and share.
- **Wrapping library calls in try/catch that silently falls back to custom math:** If the library throws on empty input, surface the error — don't silently compute custom math.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sharpe Ratio | Custom mean/stddev math | `calculateSharpeRatio` from `@railpath/finance-toolkit` | Annualization, edge cases, Zod validation of inputs |
| Sortino Ratio | Downside deviation loop | `calculateSortinoRatio` from `@railpath/finance-toolkit` | Penalizes only downside volatility correctly |
| VaR 95% | quantileSorted from simple-statistics | `calculateVaR95` / `calculateVaR` from `@railpath/finance-toolkit` | Historical/parametric/MC methods, proper confidence interval |
| Max Drawdown | Custom cumulative product loop | `calculateMaxDrawdown` from `@railpath/finance-toolkit` | Returns peak/trough indices, recovery duration, drawdown % |
| Correlation Matrix | Nested for-loop with sampleCorrelation | `calculateCorrelationMatrix` from `@railpath/finance-toolkit` | Handles alignment, returns averageCorrelation/maxCorrelation/minCorrelation |

**Key insight:** `simple-statistics` provides mathematical primitives. `@railpath/finance-toolkit` provides finance-domain functions built on those primitives with proper annualization, edge case handling, and typed results.

## Common Pitfalls

### Pitfall 1: maxDrawdown input type mismatch
**What goes wrong:** `calculateMaxDrawdown` from the library takes `{ prices: number[] }` (closing price series), not returns. Current `risk-calculations.ts:maxDrawdown()` takes returns. The `RiskService` must pass `candles.map(c => c.close)` directly, not the result of `dailyReturns()`.
**Why it happens:** The library is designed for price series, not return series — it computes returns internally.
**How to avoid:** Pass `closingPrices` to `calculateMaxDrawdown`, not `dailyReturns(closingPrices)`.
**Warning signs:** Drawdown of 0 or near-zero when you expect a significant drawdown.

### Pitfall 2: backtest-kit getSignal runs per-tick, candle fetching is expensive
**What goes wrong:** Fetching 500 candles from broker inside `getSignal` on every tick creates N×500 API calls.
**Why it happens:** `getSignal` is called for every candle in the backtest period.
**How to avoid:** The `addExchangeSchema` already registers `getCandles`. The backtest-kit framework fetches candles itself and passes them. Check if `getSignal` receives candle context; if not, pre-fetch the full candle series once before the backtest loop and close over it.
**Warning signs:** Backtest taking 30+ seconds for a 3-month period.

### Pitfall 3: candlestick package has no TypeScript types
**What goes wrong:** TypeScript errors on import because `candlestick` is a CommonJS package with no `@types`.
**Why it happens:** Package is pure JS (2016-era), no `.d.ts` files.
**How to avoid:** Add `declare module 'candlestick'` shim in `src/types/candlestick.d.ts` if used, OR don't install it at all (since OHLC validation is custom anyway). The spec mentions installing it but its utilities aren't needed for `validateOHLC`.
**Warning signs:** `Could not find a declaration file for module 'candlestick'` TypeScript error.

### Pitfall 4: @railpath/finance-toolkit uses zod v4 internally
**What goes wrong:** Zod version conflict if project uses zod v3 (`z.object` API changed in v4).
**Why it happens:** `@railpath/finance-toolkit` declares `"zod": "^4.1.11"` as a dependency.
**How to avoid:** Check current zod version in project: `npm list zod`. If project is on zod v3, they will coexist in separate instances (npm deduplication may or may not work). The toolkit uses Zod internally for input validation only — it does not leak Zod types to the consumer.
**Warning signs:** `z.ZodError` from inside the library on valid-looking inputs.

### Pitfall 5: FifoCalculator test gap — spec requires 6 specific scenarios
**What goes wrong:** Existing tests cover geometry (lots remaining, FIFO order) but may not cover the exact 6 scenarios specified in CALC-07.
**Why it happens:** Tests were written incrementally, not against the CALC spec.
**How to avoid:** Map each of the 6 spec scenarios to a named test case with exact numbers from the spec document.
**Warning signs:** `calculateSummary` tests pass but "6 scenarios" requirement fails audit.

## Code Examples

### @railpath/finance-toolkit — Sharpe
```typescript
// Source: @railpath/finance-toolkit dist/index.d.ts (verified 2026-03-28)
import { calculateSharpeRatio } from "@railpath/finance-toolkit"

const returns = [-0.02, 0.01, -0.015, 0.03, -0.01, 0.005]
const result = calculateSharpeRatio({
  returns,
  riskFreeRate: 0.21 / 248,      // CBR key rate daily
  annualizationFactor: 248,       // MOEX trading days
})
// result.sharpeRatio: number
// result.annualizedReturn: number
// result.annualizedVolatility: number
```

### @railpath/finance-toolkit — VaR
```typescript
// Source: @railpath/finance-toolkit dist/index.d.ts (verified 2026-03-28)
import { calculateVaR, calculateVaR95 } from "@railpath/finance-toolkit"

// Full control:
const result = calculateVaR(returns, { confidenceLevel: 0.95 })
// result.value: number (the VaR — positive number representing potential loss)

// Convenience (returns a number directly):
const var95 = calculateVaR95(returns)
```

### @railpath/finance-toolkit — Correlation Matrix
```typescript
// Source: @railpath/finance-toolkit dist/index.d.ts (verified 2026-03-28)
import { calculateCorrelationMatrix } from "@railpath/finance-toolkit"

const result = calculateCorrelationMatrix({
  returns: [returnsA, returnsB, returnsC],  // number[][]
  labels: ["SBER", "GAZP", "LKOH"],
})
// result.matrix: number[][]
// result.labels: string[]
// result.averageCorrelation: number
// result.maxCorrelation: number
// result.minCorrelation: number
```

### @railpath/finance-toolkit — Max Drawdown
```typescript
// Source: @railpath/finance-toolkit dist/index.d.ts (verified 2026-03-28)
// NOTE: takes prices[], not returns[]
import { calculateMaxDrawdown } from "@railpath/finance-toolkit"

const closingPrices = candles.map(c => c.close)
const result = calculateMaxDrawdown({ prices: closingPrices })
// result.maxDrawdownPercent: number (e.g. 15.3 = 15.3%)
// result.peakIndex: number
// result.troughIndex: number
// result.recoveryDuration: number | null
```

### validateOHLC — custom utility (candlestick pkg not needed)
```typescript
// src/server/services/candle-validator.ts
import type { Candle } from "@/core/types"

export function validateOHLC(c: Candle): boolean {
  return (
    c.high >= c.low &&
    c.high >= c.open &&
    c.high >= c.close &&
    c.low <= c.open &&
    c.low <= c.close &&
    c.volume >= 0 &&
    c.time <= new Date()
  )
}

export function filterValidCandles(candles: Candle[]): Candle[] {
  return candles.filter((c) => {
    if (!validateOHLC(c)) {
      console.warn("[CandleValidator] filtered broken candle", { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })
      return false
    }
    return true
  })
}
```

### BacktestService — condition evaluation sketch
```typescript
// Integration point in getSignal callback
// Fetch candles once outside the loop, close over them:
const allCandles = await broker.getCandles({ instrumentId: params.instrumentId, interval, from: params.fromDate, to: params.toDate })

getSignal: async (_symbol: string, when: Date) => {
  // Find candles up to 'when'
  const windowEnd = allCandles.findLastIndex(c => c.time <= when)
  if (windowEnd < 0) return null
  const window = allCandles.slice(0, windowEnd + 1)

  // Evaluate entry conditions
  const entryMet = evaluateConditions(window, entryPayload.conditions, entryPayload.logic)
  if (!entryMet) return null

  return {
    position: "long" as const,
    priceTakeProfit: 1 + tpPct / 100,
    priceStopLoss: 1 - slPct / 100,
    minuteEstimatedTime: Infinity,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `simple-statistics` for Sharpe/VaR | `@railpath/finance-toolkit` | Phase 12 | Proper annualization, typed results, all metrics in one library |
| Custom correlation loop | `calculateCorrelationMatrix` | Phase 12 | Replaces 20-line nested loop with single function call |
| `getSignal` always returns "long" | Real condition evaluation | Phase 12 | Backtest actually tests the strategy |
| Portfolio shows config budget | Shows sum(real BUY operations) | Phase 11 (partial) + Phase 12 verify | P&L is meaningful |

**Deprecated/outdated:**
- `risk-calculations.ts:sharpe()`: Replace with `calculateSharpeRatio` — existing function will be removed
- `risk-calculations.ts:var95()`: Replace with `calculateVaR95` — existing function will be removed
- `risk-calculations.ts:maxDrawdown()`: Replace with `calculateMaxDrawdown` — existing function will be removed
- `correlation-service.ts` nested loop: Replace with `calculateCorrelationMatrix`

## Open Questions

1. **Does backtest-kit pass candle data to getSignal, or is it purely timestamp-based?**
   - What we know: `getSignal(symbol, when)` receives symbol and timestamp
   - What's unclear: Whether backtest-kit makes candle data available to the signal callback without fetching
   - Recommendation: Test with `backtest-kit` docs/source; if not available, pre-fetch all candles before the run loop and close over them in `getSignal`

2. **Does @railpath/finance-toolkit zod v4 conflict with project's zod version?**
   - What we know: Toolkit uses `"zod": "^4.1.11"` as dependency; the package.json doesn't show project's zod version
   - What's unclear: Whether project has zod v3 installed
   - Recommendation: Run `npm list zod` in Wave 0; if conflict, they coexist in separate node_modules trees and should not cause runtime issues

3. **Strategy card "Позиция" field — initialAmount or currentAmount?**
   - What we know: CALC-15 says "Позиция = initialAmount из операций"; current code shows `stats.currentAmount` (mark-to-market)
   - What's unclear: Whether Anton wants cost basis or current value in that field
   - Recommendation: CALC-15 is explicit — show `stats.initialAmount`; current market value is already visible via P&L

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | (project runs) | — |
| `@railpath/finance-toolkit` | CALC-01, CALC-02 | ✗ (not installed) | 0.5.4 on npm | No fallback — must install |
| `candlestick` | CALC-04 | ✗ (not installed) | 1.0.2 on npm | Not needed — validateOHLC is custom |
| `trading-signals` | CALC-10-13 | ✓ | 7.4.3 | — |
| `backtest-kit` | CALC-10-13 | ✓ | 5.9.0 | — |
| `simple-statistics` | Current risk calculations | ✓ | 7.8.9 | — |
| `vitest` | All tests | ✓ | (installed) | — |

**Missing dependencies with no fallback:**
- `@railpath/finance-toolkit` — required for CALC-01, CALC-02, CALC-03. Must be installed in Wave 0.

**Missing dependencies with fallback:**
- `candlestick` — spec says to install v1.0.2, but the package provides pattern detection only, not OHLC validation. The custom `validateOHLC` function covers CALC-04/05/06 without it.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (installed, configured) |
| Config file | `vitest.config.ts` in project root |
| Quick run command | `npx vitest run src/__tests__/fifo-calculator.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CALC-01 | Sharpe result from library matches manual formula | unit | `npx vitest run src/__tests__/risk-calculations.test.ts` | ✅ (extend) |
| CALC-02 | Correlation matrix from library matches manual | unit | `npx vitest run src/__tests__/risk-calculations.test.ts` | ✅ (extend) |
| CALC-03 | Library results on 3 known datasets | unit | `npx vitest run src/__tests__/risk-calculations.test.ts` | ✅ (extend) |
| CALC-04 | validateOHLC rejects invalid candles | unit | `npx vitest run src/__tests__/candle-validator.test.ts` | ❌ Wave 0 |
| CALC-05 | Broken candles excluded from BrokerService output | unit | `npx vitest run src/__tests__/candle-validator.test.ts` | ❌ Wave 0 |
| CALC-06 | 3 broken candle types filtered | unit | `npx vitest run src/__tests__/candle-validator.test.ts` | ❌ Wave 0 |
| CALC-07 | 6 FifoCalculator scenarios with exact numbers | unit | `npx vitest run src/__tests__/fifo-calculator.test.ts` | ✅ (verify coverage) |
| CALC-08 | Average entry price across multiple entries | unit | `npx vitest run src/__tests__/fifo-calculator.test.ts` | ✅ |
| CALC-09 | Unrealized P&L on partial close | unit | `npx vitest run src/__tests__/fifo-calculator.test.ts` | ✅ |
| CALC-10 | BacktestService parses conditions | unit | `npx vitest run src/__tests__/backtest-service.test.ts` | ✅ (extend) |
| CALC-11 | Indicators computed on each candle | unit | `npx vitest run src/__tests__/backtest-service.test.ts` | ❌ Wave 0 |
| CALC-12 | Entry ALL, exit ANY logic | unit | `npx vitest run src/__tests__/backtest-service.test.ts` | ❌ Wave 0 |
| CALC-13 | RSI<30 entry, RSI>70 exit on known data | integration | `npx vitest run src/__tests__/backtest-service.test.ts` | ❌ Wave 0 |
| CALC-14 | Portfolio size = sum(BUY amounts) | unit | `npx vitest run src/__tests__/operation-actions.test.ts` | ✅ (failing) |
| CALC-15 | Strategy card "Позиция" = initialAmount | unit | `npx vitest run src/__tests__/operation-actions.test.ts` | ❌ Wave 0 |
| CALC-16 | P&L% = totalPnl / totalInvested × 100 | unit | `npx vitest run src/__tests__/operation-actions.test.ts` | ✅ (extend) |
| CALC-17 | Budget 10000₽, purchase 9780₽ → shows 9780₽ | unit | `npx vitest run src/__tests__/operation-actions.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/fifo-calculator.test.ts src/__tests__/candle-validator.test.ts src/__tests__/risk-calculations.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/candle-validator.test.ts` — covers CALC-04, CALC-05, CALC-06
- [ ] `src/__tests__/backtest-service.test.ts` — extend with CALC-11, CALC-12, CALC-13 cases
- [ ] `src/__tests__/operation-actions.test.ts` — fix 4 currently failing tests, add CALC-15, CALC-17
- [ ] `npm install @railpath/finance-toolkit` — required before CALC-01/02/03

## Sources

### Primary (HIGH confidence)
- `@railpath/finance-toolkit` package extracted from registry — `index.d.ts`, all schema files, `calculateVaR.js` implementation verified locally 2026-03-28
- `candlestick` package extracted from registry — `src/candlestick.js`, `src/utils.js` verified — confirmed no `validateOHLC`
- Codebase direct read: `fifo-calculator.ts`, `backtest-service.ts`, `risk-calculations.ts`, `risk-service.ts`, `correlation-service.ts`, `indicator-calculator.ts`, `operation-service.ts`, `paper-portfolio-view.tsx`, `strategy-card.tsx`

### Secondary (MEDIUM confidence)
- npm registry metadata for `@railpath/finance-toolkit` v0.5.4 and `candlestick` v1.0.2 — both confirmed active

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both packages verified on npm, type signatures extracted from tgz
- Architecture: HIGH — based on direct codebase read, existing patterns followed
- Pitfalls: HIGH — maxDrawdown input type confirmed from actual type definitions; backtest-kit behavior from existing code

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable libraries, 30-day estimate)
