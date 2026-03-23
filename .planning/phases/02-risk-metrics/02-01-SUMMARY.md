---
phase: 02-risk-metrics
plan: 01
subsystem: analytics
tags: [risk-metrics, sharpe, beta, var, drawdown, alpha, simple-statistics, tdd]

requires:
  - phase: 01-infrastructure-terminal
    provides: MOEXProvider for IMOEX benchmark, BrokerService for candle data
provides:
  - Pure math functions for 5 risk metrics (Sharpe, Beta, VaR, MaxDrawdown, Alpha)
  - RiskService orchestrating portfolio data fetch and metric computation
  - RiskMetrics, RiskMetricResult, MetricStatus types
affects: [02-02, 02-03, 04-diversification, 05-optimization]

tech-stack:
  added: [simple-statistics]
  patterns: [pure-math-module, tdd-first, date-alignment]

key-files:
  created:
    - src/core/types/risk.ts
    - src/server/services/risk-calculations.ts
    - src/server/services/risk-service.ts
    - src/__tests__/risk-calculations.test.ts
  modified:
    - src/core/types/index.ts
    - src/server/services/index.ts

key-decisions:
  - "Used simple-statistics for mean, standardDeviation, quantileSorted instead of manual implementations"
  - "248 trading days for annualization, CBR 21% risk-free rate"
  - "Beta/Alpha require 30+ data points, Sharpe/VaR require 2+"

patterns-established:
  - "Pure math module pattern: stateless functions exported separately from service class"
  - "Date alignment: Map<string, number> keyed by YYYY-MM-DD for cross-series matching"
  - "Weighted portfolio returns: position value / total value as weights"

requirements-completed: [RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06]

duration: 5min
completed: 2026-03-24
---

# Phase 2 Plan 01: Risk Calculations Summary

**TDD-tested pure math for 5 risk metrics (Sharpe, Beta, VaR, MaxDrawdown, Alpha) with RiskService orchestration using simple-statistics**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-23T20:56:11Z
- **Completed:** 2026-03-24T00:02:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- All 5 risk metric formulas implemented and tested with 24 unit tests
- RiskService orchestrates parallel candle fetching, benchmark alignment, and weighted portfolio returns
- Color-coded thresholds (green/yellow/red) for each metric with Russian labels and tooltips

## Task Commits

Each task was committed atomically:

1. **Task 1: Define risk types and implement pure math functions with TDD** - `3402863` (feat)
2. **Task 2: Build RiskService orchestration class** - `aa6fec6` (feat)

## Files Created/Modified
- `src/core/types/risk.ts` - MetricStatus, RiskMetricResult, RiskMetrics, MetricName types
- `src/core/types/index.ts` - Added risk barrel export
- `src/server/services/risk-calculations.ts` - Pure math: dailyReturns, sharpe, maxDrawdown, var95, beta, alpha, annualize, getMetricStatus, alignByDate
- `src/server/services/risk-service.ts` - RiskService class with calculate(userId) method
- `src/server/services/index.ts` - Added RiskService barrel export
- `src/__tests__/risk-calculations.test.ts` - 24 unit tests covering all functions and edge cases

## Decisions Made
- Used simple-statistics for statistical primitives (mean, stddev, quantile) per research guidance
- CBR key rate 21% as risk-free rate, 248 trading days per year
- Beta/Alpha null when <30 data points (insufficient for statistical significance)
- Portfolio returns weighted by position current value proportion

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed simple-statistics dependency**
- **Found during:** Task 1 (before test implementation)
- **Issue:** simple-statistics not in node_modules despite being in plan requirements
- **Fix:** Ran npm install simple-statistics with temp cache (npm cache permission issue)
- **Files modified:** package.json, package-lock.json
- **Verification:** node -e "require('simple-statistics')" succeeds
- **Committed in:** 3402863 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential dependency installation. No scope creep.

## Issues Encountered
- npm cache permission issue (root-owned directory in ~/.npm/_cacache). Resolved by using --cache /tmp/npm-cache-fix flag.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RiskService.calculate(userId) ready for server action wrapping (Plan 02)
- Types ready for UI card components (Plan 02)
- Risk data structure ready for AI analysis prompt building (Plan 03)

## Self-Check: PASSED

All 6 files verified present. Both commits (3402863, aa6fec6) confirmed in git log.

---
*Phase: 02-risk-metrics*
*Completed: 2026-03-24*
