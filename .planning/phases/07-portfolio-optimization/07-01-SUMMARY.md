---
phase: 07-portfolio-optimization
plan: 01
subsystem: api
tags: [markowitz, monte-carlo, optimization, simple-statistics, portfolio]

requires:
  - phase: 06-portfolio-analytics
    provides: "PortfolioAnalyticsService, correlation matrix, candle fetch patterns"
provides:
  - "getMarkowitzOptimization() method returning optimal weights and rebalancing actions"
  - "MarkowitzResult, MarkowitzWeights, RebalancingAction types"
  - "_buildReturnSeries() reusable return series builder"
affects: [07-02-portfolio-optimization-ui, portfolio-analytics]

tech-stack:
  added: []
  patterns: [monte-carlo-optimization, concentration-constraint-capping, lot-size-rebalancing]

key-files:
  created:
    - src/__tests__/markowitz-optimization.test.ts
  modified:
    - src/core/types/analytics.ts
    - src/server/services/portfolio-analytics-service.ts

key-decisions:
  - "RF rate 0.16 (CBR key rate) for Sharpe ratio calculation"
  - "10k Monte Carlo iterations with concentration cap at 0.4 per position"
  - "Positions with < 20 return observations locked at zero weight (not optimized)"

patterns-established:
  - "Monte Carlo weight sampling with multi-pass concentration capping loop"
  - "_buildReturnSeries extracted for reuse across correlation and optimization"

requirements-completed: [PORT-06, PORT-07]

duration: 4min
completed: 2026-03-26
---

# Phase 07 Plan 01: Markowitz Optimization Summary

**Monte Carlo Markowitz optimizer with 10k iterations, long-only + 0.4 concentration cap, lot-size rebalancing via BrokerInstrument**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T19:55:12Z
- **Completed:** 2026-03-26T19:59:28Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- MarkowitzResult, MarkowitzWeights, RebalancingAction types added to analytics.ts
- getMarkowitzOptimization() method with Monte Carlo sampling (10k iterations, best Sharpe)
- _buildReturnSeries() private method extracted from candle-fetch logic
- Rebalancing actions with real lot sizes from BrokerInstrument
- 10 unit tests covering weights sum, long-only, concentration, edge cases, rebalancing

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests** - `129ae8e` (test)
2. **Task 1 (GREEN): Implement Markowitz optimizer** - `0a426aa` (feat)

_TDD task with RED/GREEN commits_

## Files Created/Modified
- `src/core/types/analytics.ts` - Added MarkowitzResult, MarkowitzWeights, RebalancingAction types
- `src/server/services/portfolio-analytics-service.ts` - Added getMarkowitzOptimization() and _buildReturnSeries()
- `src/__tests__/markowitz-optimization.test.ts` - 10 test cases for optimizer and rebalancing

## Decisions Made
- RF rate set to 0.16 (current CBR key rate approximation) for Sharpe ratio
- 10,000 Monte Carlo iterations balances accuracy vs speed
- Multi-pass concentration capping loop ensures no weight exceeds 0.4 after redistribution
- Positions with insufficient data (< 20 returns) get zero optimal weight to avoid noise
- Both STOCK and ETF instruments fetched for lot size lookup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed concentration cap redistribution loop**
- **Found during:** Task 1 GREEN phase
- **Issue:** Single-pass cap redistribution could leave weights > 0.4 when excess was redistributed to positions already near cap
- **Fix:** Added multi-pass loop (up to 10 passes) with skip for already-capped positions, plus final validation to skip invalid weight vectors
- **Files modified:** src/server/services/portfolio-analytics-service.ts
- **Verification:** Test "no single weight exceeds 0.4" passes consistently
- **Committed in:** 0a426aa

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential correctness fix for concentration constraint. No scope creep.

## Issues Encountered
- Pre-existing test failures in operation-actions.test.ts (unrelated to this plan, not introduced by changes)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Markowitz optimization backend complete, ready for UI integration in 07-02
- Types exported and available for frontend components
- All constraints (long-only, concentration cap, lot-size math) verified with tests

---
*Phase: 07-portfolio-optimization*
*Completed: 2026-03-26*
