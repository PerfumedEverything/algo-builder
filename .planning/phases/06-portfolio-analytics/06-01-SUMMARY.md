---
phase: "06"
plan: "01"
subsystem: portfolio-analytics
tags: [analytics, correlation, sector-allocation, backend, server-actions]
dependency_graph:
  requires: [broker-service, operation-service, strategy-repository, fundamentals-map, simple-statistics]
  provides: [getCorrelationMatrixAction, getPortfolioAnalyticsAction, PortfolioAnalyticsService]
  affects: [portfolio-page, analytics-ui]
tech_stack:
  added: []
  patterns: [service-layer, server-actions, batch-fetching]
key_files:
  created:
    - src/core/types/analytics.ts (extended with CorrelationMatrix, SectorAllocation, AssetTypeBreakdown, TradeSuccessBreakdown, PortfolioAnalytics)
    - src/server/services/portfolio-analytics-service.ts
  modified:
    - src/server/actions/analytics-actions.ts
    - src/server/services/index.ts
decisions:
  - recharts was already installed in package.json (skipped install step)
  - Batch size of 3 for candle fetching to avoid rate limiting (consistent with risk-service pattern)
  - Used FUNDAMENTALS_MAP for static sector lookup (MOEX ISS sector API is medium confidence)
  - Correlation matrix computed only for STOCK + ETF positions (excludes BOND, CURRENCY, FUTURES)
metrics:
  duration: "~4 min"
  completed_date: "2026-03-26"
  tasks_completed: 5
  files_changed: 4
---

# Phase 06 Plan 01: Analytics Service + Server Actions Summary

## One-liner

Portfolio analytics backend: Pearson correlation matrix, sector allocation via FUNDAMENTALS_MAP, asset type breakdown, and trade success breakdown — all exposed via typed server actions.

## What Was Built

### Types (`src/core/types/analytics.ts`)

Added 5 new types to existing analytics types file:
- `CorrelationMatrix` — tickers, n×n matrix, highPairs (|corr| > 0.7)
- `SectorAllocation` — sector, value, percent, tickers
- `AssetTypeBreakdown` — type, label, value, percent, count
- `TradeSuccessBreakdown` — profitable and unprofitable strategy P&L stats
- `PortfolioAnalytics` — composed type for single combined analytics call

### Service (`src/server/services/portfolio-analytics-service.ts`)

`PortfolioAnalyticsService` class with 4 methods:
1. `getCorrelationMatrix(userId)` — fetches 90-day daily candles in batches of 3, computes daily returns, Pearson pairwise correlation via `sampleCorrelation` from simple-statistics, returns highPairs where |corr| > 0.7
2. `getSectorAllocation(positions)` — maps tickers to sectors via FUNDAMENTALS_MAP (fallback: "other"), groups by sector, returns sorted by value descending
3. `getAssetTypeBreakdown(positions)` — groups by `instrumentType` field, labels in Russian, returns sorted by value descending
4. `getTradeSuccessBreakdown(userId)` — loads all user strategies, computes P&L stats per strategy via OperationService, classifies as profitable/unprofitable

### Server Actions (`src/server/actions/analytics-actions.ts`)

Added to existing file (preserving getImoexCandlesAction, getDividendsAction):
- `getCorrelationMatrixAction()` — auth → `analyticsService.getCorrelationMatrix(userId)`
- `getPortfolioAnalyticsAction()` — auth → loads portfolio, calls getSectorAllocation, getAssetTypeBreakdown, getTradeSuccessBreakdown in parallel (sector + asset type are sync, trade success is async)

### Barrel Export (`src/server/services/index.ts`)

Added `PortfolioAnalyticsService` export.

## Deviations from Plan

### Pre-existing recharts

**Found during:** Task 1 (install recharts)
**Issue:** recharts was already installed in package.json ("recharts": "^3.8.1")
**Fix:** Skipped npm install — no action needed
**Deviation type:** Informational, no code change

None — plan executed with one informational deviation (recharts already installed).

## Known Stubs

None. All methods are fully implemented with real data sources.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1+3 | 6a666e0 | feat(06-01): add portfolio analytics types |
| 2 | 70d26e2 | feat(06-01): add PortfolioAnalyticsService |
| 4 | f2ebb66 | feat(06-01): add server actions |
| 5 | 055d4ef | chore(06-01): barrel export |

## Self-Check: PASSED

All files found. All commits verified.
