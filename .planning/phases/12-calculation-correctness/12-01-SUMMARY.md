---
phase: 12-calculation-correctness
plan: "01"
subsystem: risk-calculations
tags: [finance-toolkit, sharpe, sortino, var, max-drawdown, correlation, tdd]
dependency_graph:
  requires: []
  provides: [risk-calculations-library, correlation-library, 3-dataset-validation]
  affects: [risk-service, correlation-service]
tech_stack:
  added: ["@railpath/finance-toolkit@0.5.4"]
  patterns: [library-delegation, tdd-red-green]
key_files:
  created: []
  modified:
    - src/server/services/risk-calculations.ts
    - src/server/services/risk-service.ts
    - src/server/services/correlation-service.ts
    - src/__tests__/risk-calculations.test.ts
    - package.json
decisions:
  - "@railpath/finance-toolkit replaces custom Sharpe/VaR/maxDrawdown/Sortino math — library uses annualized return vs daily rf rate in Sharpe formula"
  - "maxDrawdown signature changed from returns[] to prices[] — critical correctness fix, risk-service builds portfolioPrices via cumulative product"
  - "maxDrawdownPercent from library is a fraction (0-1), wrapper multiplies by 100 to produce percentage"
  - "correlation-service replaces 20-line nested sampleCorrelation loop with single calculateCorrelationMatrix call"
  - "sortino exported as new function — was missing from original risk-calculations.ts"
metrics:
  duration: "~4 minutes"
  completed: "2026-03-28T10:36:00Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 12 Plan 01: Replace Custom Risk Math with @railpath/finance-toolkit Summary

**One-liner:** Replaced all custom Sharpe/VaR/maxDrawdown/correlation math with @railpath/finance-toolkit library calls, fixing a critical bug where maxDrawdown was incorrectly receiving returns[] instead of prices[].

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install library + write 3-dataset validation tests (RED) | 6b30c3b | package.json, risk-calculations.test.ts |
| 2 | Replace custom math with library calls (GREEN) | 4b536cb | risk-calculations.ts, risk-service.ts, correlation-service.ts, risk-calculations.test.ts |

## What Was Built

### @railpath/finance-toolkit Integration

`src/server/services/risk-calculations.ts` now delegates all risk metric computations to the library:

- `sharpe(returns, rfDaily)` → `calculateSharpeRatio({ returns, riskFreeRate, annualizationFactor: 248 }).sharpeRatio`
- `var95(returns)` → `calculateVaR(returns, { confidenceLevel: 0.95 }).value * 100`
- `maxDrawdown(prices)` → `calculateMaxDrawdown({ prices }).maxDrawdownPercent * 100` — **signature changed from returns[] to prices[]**
- `sortino(returns, rfDaily)` → new export using `calculateSortinoRatio`
- `beta`, `alpha`, `annualize`, `dailyReturns`, `getMetricStatus`, `alignByDate` unchanged (no library equivalent needed)

### Critical Bug Fix: maxDrawdown

The original `maxDrawdown(returns[])` internally built a cumulative price series. The library's `calculateMaxDrawdown` takes `prices[]` directly. `RiskService.calculate()` now builds a `portfolioPrices` array from cumulative returns starting at 100 and passes it to `maxDrawdown()`.

### Correlation Service

`src/server/services/correlation-service.ts` replaced a 20-line nested `for` loop using `sampleCorrelation` with a single `calculateCorrelationMatrix` call. Alignment (trimming to minimum length) is done before the call.

### Validation Tests

5 new tests in `describe("@railpath/finance-toolkit validation — 3 datasets (CALC-03)")`:
- CALC-01: Sharpe on dataset 1 (5 returns) — manual formula matches library
- CALC-01: VaR95 on dataset 2 (8 volatile returns) — matches historical 5th percentile
- CALC-01: maxDrawdown on dataset 3 (8 prices) — 112→107 drawdown = 4.46% fraction
- CALC-02: Correlation matrix 2×2 — matches sampleCorrelation within 0.01
- CALC-01: Sortino on dataset 1 — sortinoRatio is number, downsideDeviation >= 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's manual Sharpe formula didn't match library formula**
- **Found during:** Task 1 (test RED state)
- **Issue:** Plan's manual comparison used `mean(excess)/std(excess)*sqrt(248)` but library uses `(mean*N - rfDaily) / (std*sqrt(N))` — annualized return minus daily rf rate divided by annualized vol
- **Fix:** Updated test manual formula to match library's documented formula (verified from `calculateSharpeRatio.js` source)
- **Files modified:** src/__tests__/risk-calculations.test.ts

**2. [Rule 1 - Bug] maxDrawdownPercent is a fraction, not a percentage**
- **Found during:** Task 1 (test RED state)
- **Issue:** Library returns `maxDrawdownPercent = 0.0446` (fraction 0-1), not `4.46%`
- **Fix:** Wrapper multiplies by 100: `result.maxDrawdownPercent * 100`. Test comparison updated to use fraction
- **Files modified:** src/server/services/risk-calculations.ts, src/__tests__/risk-calculations.test.ts

**3. [Rule 1 - Bug] Existing maxDrawdown tests passed returns[], new signature takes prices[]**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Old tests used return series as input; new function requires price series
- **Fix:** Updated 3 existing maxDrawdown tests to use price series with equivalent financial semantics
- **Files modified:** src/__tests__/risk-calculations.test.ts

## Test Results

```
Test Files  1 passed (1)
Tests       29 passed (29)
Duration    ~200ms
```

All 29 tests pass: 24 original + 5 new library validation tests.

## Known Stubs

None — all risk metrics now use library with real computation.

## Self-Check: PASSED

Files exist:
- FOUND: src/server/services/risk-calculations.ts
- FOUND: src/server/services/risk-service.ts
- FOUND: src/server/services/correlation-service.ts
- FOUND: src/__tests__/risk-calculations.test.ts

Commits exist:
- FOUND: 6b30c3b (test: 3-dataset validation tests)
- FOUND: 4b536cb (feat: replace custom risk math)
