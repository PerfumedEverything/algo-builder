---
phase: 17-smoke-monitor-test-coverage
plan: "05"
subsystem: testing
tags: [portfolio-analytics, indicator-calculator, unit-tests, edge-cases]
dependency_graph:
  requires: [17-01]
  provides: [TEST-03, TEST-04]
  affects: [portfolio-analytics-service, indicator-calculator]
tech_stack:
  added: []
  patterns: [vitest, vi.mock, edge-case-testing]
key_files:
  created: []
  modified:
    - src/__tests__/portfolio-analytics-service.test.ts
    - src/__tests__/indicator-calculator.test.ts
decisions:
  - PortfolioAnalyticsService mocks added for CorrelationService, portfolio-benchmark-service, portfolio-dividend-service
  - makeCandle helper added to indicator-calculator.test.ts for flat/single candle scenarios
metrics:
  duration_min: 2
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
---

# Phase 17 Plan 05: Expand Service Test Coverage Summary

One-liner: Expanded PortfolioAnalyticsService to 31 tests (all 7 public methods) and IndicatorCalculator to 40 tests (10 new edge cases covering empty/flat/insufficient data scenarios).

## What Was Built

**Task 1 — PortfolioAnalyticsService (TEST-03):**
- Added vi.mock for CorrelationService, portfolio-benchmark-service, portfolio-dividend-service
- Added 3 new describe blocks: getCorrelationMatrix, getBenchmarkComparison, getAggregateDividendYield
- Added empty portfolio edge cases for all 4 sync/async public methods
- Added error isolation test (missing stats entry handled gracefully, others still return)
- Total: 31 tests (was 18, added 13)

**Task 2 — IndicatorCalculator (TEST-04):**
- Added `makeCandle(close, i)` helper for flat/single candle fixtures
- Added new "edge cases" describe block with 10 tests:
  - Empty array: RSI/SMA/EMA/MACD/Bollinger all return null without throw
  - Single candle: all indicators return null gracefully
  - Flat market: SMA/EMA equal price, RSI does not throw
  - Insufficient data: period=20 with 5 candles returns null
  - BollingerBands period+1 boundary: exact stability threshold
  - MACD flat prices: histogram close to 0
  - Crossing at exact boundary: getPriceChange=0 for identical prices
- Total: 40 tests (was 30, added 10)

## Verification Results

```
Test Files: 2 passed
Tests: 71 passed (31 portfolio-analytics + 40 indicator-calculator)
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check

- [x] src/__tests__/portfolio-analytics-service.test.ts — modified, 31 tests
- [x] src/__tests__/indicator-calculator.test.ts — modified, 40 tests
- [x] Commits: ce53ab6 (portfolio), c5a9e69 (indicator)

## Self-Check: PASSED
