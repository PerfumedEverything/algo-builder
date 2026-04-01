---
phase: 20-ui-data-flow-fixes
plan: 02
subsystem: frontend/pages
tags: [filters, useMemo, client-side, analytics, visibility]
dependency_graph:
  requires: []
  provides: [UIDF-01, UIDF-02, UIDF-06, UIDF-09]
  affects: [strategies-page, signals-page, portfolio-page]
tech_stack:
  added: []
  patterns: [useMemo client-side filtering, visibility guard on setInterval]
key_files:
  created: []
  modified:
    - src/app/(dashboard)/strategies/page.tsx
    - src/app/(dashboard)/signals/page.tsx
    - src/app/(dashboard)/portfolio/page.tsx
decisions:
  - filteredStrategies/filteredSignals useMemo derive from server-fetched list — no extra requests needed
  - portfolio analytics useEffect intentionally omits fetchAnalytics from deps to avoid infinite loop
  - eslint-disable comment added for the intentional exhaustive-deps exception in portfolio page
metrics:
  duration: 3 min
  completed: "2026-04-01T10:18:00Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 20 Plan 02: UI Data Flow Fixes Summary

Client-side useMemo filters for strategies (instrumentType + timeframe) and signals (timeframe), portfolio analytics auto-refresh on position change, strategies interval visibility guard.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Strategies client-side filters + visibility check | 9f20378 | strategies/page.tsx |
| 2 | Signals timeframe filter + portfolio analytics refresh | 477c463 | signals/page.tsx, portfolio/page.tsx |

## Changes Made

### Task 1 — strategies/page.tsx

- Added `filteredStrategies` useMemo after `portfolioSummary` useMemo, filtering by `filters.instrumentType` and `filters.timeframe`
- Changed grid render to use `filteredStrategies` instead of `strategies`
- Added nested ternary: when `strategies.length > 0` but `filteredStrategies.length === 0`, show "Нет стратегий, соответствующих фильтрам"
- Fixed `setInterval` callback to check `document.hidden` before calling `fetchData()`

### Task 2 — signals/page.tsx

- Added `useMemo` to React import
- Added `filteredSignals` useMemo filtering by `filters.timeframe`
- Changed signal grid to render from `filteredSignals` with "Нет сигналов, соответствующих фильтрам" fallback

### Task 2 — portfolio/page.tsx

- Added `useEffect` that re-calls `fetchAnalytics()` when `portfolio?.positions` changes
- Guard: only fires if `correlationMatrix || portfolioAnalytics` already set (i.e., analytics tab was opened)
- Intentional exhaustive-deps exception documented with eslint-disable comment

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/app/(dashboard)/strategies/page.tsx` — exists, modified
- `src/app/(dashboard)/signals/page.tsx` — exists, modified
- `src/app/(dashboard)/portfolio/page.tsx` — exists, modified
- Commit 9f20378 — verified
- Commit 477c463 — verified
- No TypeScript errors in modified files
