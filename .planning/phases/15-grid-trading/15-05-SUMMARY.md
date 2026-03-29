---
phase: 15-grid-trading
plan: "05"
subsystem: grid-trading
tags: [grid, ai, atr, deepseek, volatility, server-action]
dependency_graph:
  requires: [15-01, 15-03]
  provides: [grid-ai-service, suggest-grid-params-action]
  affects: [grid-actions, grid-trading-ui]
tech_stack:
  added: []
  patterns: [ATR-volatility-range, deepseek-reasoning-fallback, auth-checked-server-action]
key_files:
  created:
    - src/server/services/grid-ai-service.ts
  modified:
    - src/server/actions/grid-actions.ts
decisions:
  - "ATR(14) via IndicatorCalculator (trading-signals) for range — no custom math"
  - "DeepSeek chat model for Russian reasoning with 10s timeout + template fallback"
  - "Range = currentPrice ± 2*ATR, minimum 4% enforced, precision auto-derived from price magnitude"
  - "Levels = round(priceRange / (ATR*0.5)) clamped [5, 30]"
  - "amountPerOrder defaults to 10 USDT (paper trading safe default)"
metrics:
  duration: 118s
  completed: "2026-03-28"
  tasks_completed: 2
  files_modified: 2
---

# Phase 15 Plan 05: AI Grid Parameter Suggestion Summary

**One-liner:** ATR(14)-based grid parameter suggestion via trading-signals + DeepSeek reasoning with template fallback.

## Objective

Implement AI-powered grid parameter suggestion so users get one-click auto-filled grid parameters based on volatility analysis. Inspired by Pionex AI 2.0 pattern (D-01).

## Tasks Completed

### Task 1: GridAiService (feat/15-05 — 298fa12)

Created `src/server/services/grid-ai-service.ts`:

- `GridSuggestion` type with: `lowerPrice`, `upperPrice`, `gridLevels`, `amountPerOrder`, `gridDistribution`, `feeRate`, `reasoning`, `expectedProfitPerGrid`, `estimatedMonthlyTrades`
- `GridAiService.suggestParams()` static method:
  1. Fetches 1h candles for lookback period via `BrokerService.getCandles`
  2. Computes ATR(14) via `IndicatorCalculator.calculateATR` (trading-signals)
  3. Range = `currentPrice ± 2*ATR`, minimum 4% enforced, auto-precision from price magnitude
  4. Levels = `round(priceRange / (ATR * 0.5))`, clamped to [5, 30]
  5. `expectedProfitPerGrid = (step/lowerPrice)*100 - feeRate*200`
  6. `estimatedMonthlyTrades` from ATR-crossing count projected to 720h/month
  7. DeepSeek chat call for Russian reasoning, 10s timeout → template fallback on failure

### Task 2: suggestGridParamsAction (feat/15-05 — 0547636)

Appended to existing `src/server/actions/grid-actions.ts` (Plan 03 actions preserved):

- `suggestGridParamsAction({ instrumentId, instrument, lookbackDays? })` → `ApiResponse<GridSuggestion>`
- Auth-checked via `getCurrentUserId()` before delegation
- All 4 existing actions from Plan 03 untouched: `createGridAction`, `stopGridAction`, `getGridStatusAction`, `processGridTickAction`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. `amountPerOrder` defaults to 10 USDT (documented default for paper trading, not a stub).

## Self-Check: PASSED

- `src/server/services/grid-ai-service.ts` — file exists, no TS errors
- `src/server/actions/grid-actions.ts` — file exists, no TS errors
- Commits: `298fa12` (GridAiService), `0547636` (suggestGridParamsAction)
- Pre-existing TS errors in `ai-chat.tsx` and test files are out-of-scope (existed before this plan)
