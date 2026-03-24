---
phase: 02-risk-metrics
plan: 02
subsystem: analytics
tags: [risk-metrics, server-actions, redis-cache, tooltip, skeleton-loading, ui-cards]

requires:
  - phase: 02-risk-metrics
    plan: 01
    provides: RiskService.calculate(), RiskMetrics/RiskMetricResult types
provides:
  - getRiskMetricsAction server action with Redis 24h cache
  - RiskMetricCard component with color-coded status and tooltip
  - RiskMetricsSection with 5-card responsive grid and skeleton loading
  - Portfolio page integration (below positions table)
affects: [02-03]

tech-stack:
  added: []
  patterns: [self-contained-section-component, server-action-cache-pattern]

key-files:
  created:
    - src/server/actions/risk-actions.ts
    - src/components/portfolio/risk-metric-card.tsx
    - src/components/portfolio/risk-metrics-section.tsx
  modified:
    - src/components/broker/portfolio-view.tsx

key-decisions:
  - "Card hover tooltip shows metric explanation in Russian"
  - "RiskMetricsSection is self-contained: fetches own data via server action, no props from parent"
  - "Redis cache key pattern risk:{userId} with 24h TTL"

patterns-established:
  - "Self-contained analytics section: client component fetches own data on mount via server action"
  - "Color-coded metric card: green/yellow/red status mapped to Tailwind color classes"

requirements-completed: [RISK-07, RISK-08]

duration: 3min
completed: 2026-03-24
---

# Phase 2 Plan 02: Risk Metrics UI Summary

**Server action with Redis 24h cache and 5 color-coded risk metric cards (Sharpe, Beta, VaR, MaxDrawdown, Alpha) with tooltips on portfolio page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T21:05:34Z
- **Completed:** 2026-03-23T21:08:05Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Server action getRiskMetricsAction with Redis 24h cache (risk:{userId} key, 86400s TTL)
- RiskMetricCard with color-coded status (green/yellow/red), formatted values, and shadcn tooltips
- RiskMetricsSection with 5-card responsive grid (2-col mobile, 5-col desktop) and skeleton loading
- Integrated below positions table in PortfolioView

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server action and risk metric card components** - `457f7a6` (feat)
2. **Task 2: Integrate risk metrics section into portfolio page** - `9942cfe` (feat)
3. **Task 3: Visual verification of risk metrics cards** - checkpoint:human-verify (pending)

## Files Created/Modified
- `src/server/actions/risk-actions.ts` - Server action with Redis cache for risk metrics
- `src/components/portfolio/risk-metric-card.tsx` - Single metric card with color status and tooltip
- `src/components/portfolio/risk-metrics-section.tsx` - 5-card grid section with loading skeleton
- `src/components/broker/portfolio-view.tsx` - Added RiskMetricsSection import and render

## Decisions Made
- RiskMetricsSection is self-contained (fetches own data on mount) for zero coupling with PortfolioView
- Null metric values display em-dash with "Insufficient data" tooltip text in Russian
- Card hover effect (bg-accent/30) for interactive feel

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Risk metrics UI ready for AI analysis integration (Plan 03)
- Cards render metric data from RiskService via cached server action
- Pending: human visual verification (Task 3 checkpoint)

## Self-Check: PASSED

All 4 files verified present. Both commits (457f7a6, 9942cfe) confirmed in git log.

---
*Phase: 02-risk-metrics*
*Completed: 2026-03-24*
