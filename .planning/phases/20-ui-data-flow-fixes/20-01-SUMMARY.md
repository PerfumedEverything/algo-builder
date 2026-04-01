---
phase: 20-ui-data-flow-fixes
plan: "01"
subsystem: terminal
tags: [bug-fix, react-hooks, data-flow, stale-closure, interval]
dependency_graph:
  requires: []
  provides: [terminal-page-fixed-data-flows]
  affects: [terminal/page.tsx, grid-form.tsx]
tech_stack:
  added: []
  patterns: [useRef-for-loading-guard, explicit-param-over-closure, interval-with-visibility-check]
key_files:
  created: []
  modified:
    - src/app/(dashboard)/terminal/page.tsx
    - src/app/(dashboard)/terminal/_components/grid-form.tsx
decisions:
  - fetchDailyStats now requires explicit period param — no stale closure, caller always owns period value
  - topMoversLoadedRef replaces topMovers state in fetchTopMovers deps — fixes interval restart on every fetch
  - document.hidden guard in fetchPositions interval — avoids unnecessary requests when tab not visible
metrics:
  duration: 2min
  completed_date: "2026-04-01T10:18:07Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 20 Plan 01: Terminal Data Flow Fixes Summary

Surgical fix of 5 React data flow bugs in the terminal page: stale price bar %, positions never refresh, grid levels persist on instrument change, onLevelsChange called during render, and topMovers interval restarting on every tick.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Fix 4 terminal page data flow bugs | 49e8d97 | terminal/page.tsx |
| 2 | Fix grid-form onLevelsChange during render | 319905a | grid-form.tsx |

## Changes Made

### terminal/page.tsx

- `useRef` added to React imports; `topMoversLoadedRef` ref declared at component top
- `fetchDailyStats`: signature changed from `(figi, p?)` to `(figi, p)`, removed `p ?? period` fallback, deps changed from `[period]` to `[]`
- `handleInstrumentSelect`: added `setGridChartLevels([])` on instrument change; updated `fetchDailyStats(inst.figi)` to `fetchDailyStats(inst.figi, period)`
- `useEffect` for fetchDailyStats: updated callers to pass `period` explicitly, added `period` to deps array
- `fetchPositions useEffect`: added `setInterval(() => { if (!document.hidden) fetchPositions() }, 10_000)` with cleanup
- `fetchTopMovers`: replaced `if (!topMovers)` with `if (!topMoversLoadedRef.current)`, set `topMoversLoadedRef.current = true` on success, changed deps from `[topMovers]` to `[]`

### grid-form.tsx

- Added `useEffect` to React imports
- Removed render-time side effect `if (onLevelsChange) { onLevelsChange(previewLevels) }`
- Added `useEffect(() => { onLevelsChange?.(previewLevels) }, [JSON.stringify(previewLevels), onLevelsChange])`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/app/(dashboard)/terminal/page.tsx` — exists, modified
- `src/app/(dashboard)/terminal/_components/grid-form.tsx` — exists, modified
- Commit 49e8d97 — verified
- Commit 319905a — verified
- TypeScript: no errors in modified files (pre-existing test errors in `__tests__/` are out of scope)
