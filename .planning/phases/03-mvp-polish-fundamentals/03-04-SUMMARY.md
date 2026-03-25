---
phase: 03-mvp-polish-fundamentals
plan: "04"
subsystem: fundamentals-data-layer
tags: [fundamentals, service, scoring, moex, static-data]
dependency_graph:
  requires: [INFR-02b]
  provides: [FUND-01, FUND-02]
  affects: [portfolio-analytics, ai-analysis]
tech_stack:
  added: []
  patterns: [service-layer, sector-relative-scoring, static-data-map]
key_files:
  created:
    - src/core/types/fundamental.ts
    - src/core/data/fundamentals-map.ts
    - src/server/services/fundamental-service.ts
    - src/server/actions/fundamental-actions.ts
    - src/__tests__/fundamental-service.test.ts
  modified:
    - src/core/types/index.ts
    - src/server/services/index.ts
decisions:
  - scoreLabel boundary is <=4 for cheap (not <=3) to match plan spec with sector-relative P/E scoring
metrics:
  duration: "~10 minutes"
  completed: "2026-03-25T12:10:39Z"
  tasks_completed: 2
  files_changed: 6
---

# Phase 03 Plan 04: Fundamentals Data Layer Summary

## One-liner

Static P/E, P/B map for 46 MOEX tickers with FundamentalService providing sector-relative composite score 1-10 and auth-protected server action.

## What Was Built

### Task 1: Fundamental Types and Static Data Map

Created the foundation types and data:

- `src/core/types/fundamental.ts`: `FundamentalsEntry`, `FundamentalMetrics`, `SectorMedians` types
- `src/core/data/fundamentals-map.ts`: `FUNDAMENTALS_MAP` with 46 top MOEX tickers (SBER, GAZP, LKOH, YNDX, NVTK, ROSN, GMKN, MTSS, ALRS, TCSG, VTBR, MGNT, PLZL, SNGS, SNGSP, CHMF, NLMK, MAGN, AFLT, PIKK, OZON, VKCO, FIXP, TATN, TATNP, BSPB, RUAL, POLY, MOEX, RTKM, IRAO, HYDR, FEES, PHOR, FLOT, TRNFP, CBOM, SMLT, MTLR, MTLRP, SGZH, LENT, AFKS, GLTR, UPRO, SBERPREF)
- `SECTOR_PE_MEDIANS`: sector benchmarks for 12 sectors (finance, energy, tech, metals, retail, telecom, transport, construction, utilities, chemicals, forestry, conglomerate)
- `src/core/types/index.ts` updated with barrel export

### Task 2: FundamentalService + Server Action + Tests (TDD)

- `FundamentalService.getMetrics(ticker, currentPrice)`: returns `FundamentalMetrics` with P/E, P/B, dividend yield, composite score, label
- `calculateScore(pe, pb, dividendYield, sector)`: sector-relative scoring with P/E (40%), P/B (30%), dividend yield (30%) weights
- Score 1-10: <=4 cheap, <=6 fair, >6 expensive
- `calculateDividendYield`: sums last 12 months MOEX dividends / currentPrice * 100, gracefully returns null on error
- Unknown tickers return `hasFundamentals=false` with score=5 (neutral), no error thrown
- `getFundamentalsAction`: auth-protected server action (`getCurrentUserId()` first), returns `ApiResponse<FundamentalMetrics>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] scoreLabel boundary adjusted to <=4 for "cheap"**
- **Found during:** Task 2 TDD GREEN phase (test failure)
- **Issue:** Plan spec says SBER (pe=4.2, sector finance median=5.0) should score ~3-4 and label "cheap". With <=3 boundary, score=4 returned "fair" instead
- **Fix:** Changed `scoreLabel` threshold from `score <= 3` to `score <= 4` for "cheap"
- **Files modified:** `src/server/services/fundamental-service.ts`
- **Commit:** 99dbe23

## Test Results

All 8 unit tests pass:
- `calculateScore` with cheap SBER-like values => score <= 4
- `calculateScore` with expensive values => score >= 7
- `calculateScore` with all nulls => score = 5
- `calculateScore` range stays 1-10
- `getMetrics` with unknown ticker => hasFundamentals=false
- `getMetrics` with SBER => hasFundamentals=true, pe=4.2, scoreLabel="cheap"
- `getMetrics` with OZON (null pe/pb) => hasFundamentals=true
- `getMetrics` with getDividends failure => dividendYield=null (graceful)

**Note:** 6 pre-existing failures in `moex-provider.test.ts` are unrelated network-dependent tests, present before this plan.

## Commits

| Hash    | Type | Description |
|---------|------|-------------|
| d63e178 | feat | fundamental types and static MOEX data map |
| c2a68b3 | test | add failing tests for FundamentalService (TDD RED) |
| 99dbe23 | feat | FundamentalService with composite scoring and server action |

## Known Stubs

None — service returns real data from static map and MOEX API; no placeholder content.

## Self-Check: PASSED
