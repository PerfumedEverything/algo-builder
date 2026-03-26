---
phase: 05-terminal-top-movers
plan: 01
subsystem: terminal
tags: [ui, terminal, top-movers, market-hours, polling]
dependency_graph:
  requires: []
  provides: [TopMoversPanel, isMarketOpen]
  affects: [terminal-page]
tech_stack:
  added: [jsdom, @vitejs/plugin-react]
  patterns: [TDD, pure-utility, named-export, polling-with-cleanup]
key_files:
  created:
    - src/lib/market-hours.ts
    - src/components/terminal/top-movers-panel.tsx
    - src/__tests__/lib/market-hours.test.ts
    - src/__tests__/terminal/top-movers-panel.test.tsx
  modified:
    - src/app/(dashboard)/terminal/page.tsx
    - vitest.config.ts
    - package.json
decisions:
  - "Added @vitejs/plugin-react + jsdom to enable React component testing with vitest"
  - "Reduced empty-state container height from 500px to 300px to accommodate TopMoversPanel below"
  - "TopMoversPanel shown in both states: no-instrument (discovery) and instrument-selected (context)"
metrics:
  duration: "~7 min"
  completed: "2026-03-26"
  tasks: 2
  files: 6
---

# Phase 05 Plan 01: Terminal Top Movers Summary

**One-liner:** TopMoversPanel two-column grid (gainers/losers) with isMarketOpen MSK-timezone utility, 60-second auto-refresh, skeleton loading, and market-closed badge.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create isMarketOpen utility and TopMoversPanel component with tests | 48b61ac | src/lib/market-hours.ts, src/components/terminal/top-movers-panel.tsx, src/__tests__/lib/market-hours.test.ts, src/__tests__/terminal/top-movers-panel.test.tsx, vitest.config.ts, package.json |
| 2 | Integrate TopMoversPanel into terminal page with polling and layout reorder | fcdca32 | src/app/(dashboard)/terminal/page.tsx |

## What Was Built

### isMarketOpen (`src/lib/market-hours.ts`)
Pure function that determines if MOEX is open. Takes optional `Date` (defaults to `new Date()`). Converts to MSK (UTC+3), derives MSK day-of-week via shifted UTC date (avoids UTC/MSK midnight boundary pitfall), returns true if Mon-Fri 09:50-18:50 MSK.

### TopMoversPanel (`src/components/terminal/top-movers-panel.tsx`)
Two-column grid: "Топ роста" (TrendingUp, emerald) + "Топ падения" (TrendingDown, red). Each column shows 5 mover rows as clickable buttons that fire `onSelect(ticker)`. Loading state shows 5 skeleton rows per column. Outside trading hours shows "Биржа закрыта" badge in each column header.

### Terminal Page Integration (`src/app/(dashboard)/terminal/page.tsx`)
- `fetchTopMovers` callback with `getTopMoversAction()` — only shows skeleton on first load (`if (!topMovers)`)
- `useEffect` polling with `setInterval(fetchTopMovers, 60_000)` and cleanup
- `isMarketOpen()` recomputed on every poll (ensures timezone transitions are detected)
- Panel rendered in no-instrument state (discovery mode) and in instrument state (between chart and positions)

## Tests

- 7 market-hours tests: all timezone and boundary cases (Wednesday open/closed, Saturday/Sunday, Mon 09:50 inclusive, Fri 18:50 exclusive)
- 7 TopMoversPanel tests: rendering, click handlers (gainer/loser), skeleton display, market-closed badge presence/absence

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing jsdom and @vitejs/plugin-react for React component testing**
- **Found during:** Task 1, TDD RED phase running top-movers-panel.test.tsx
- **Issue:** vitest config used `environment: "node"` globally; jsdom package not installed; no JSX transform configured
- **Fix:** Installed `jsdom` and `@vitejs/plugin-react`, added React plugin to vitest.config.ts
- **Files modified:** vitest.config.ts, package.json
- **Commits:** 48b61ac

**2. [Rule 3 - Blocking] @testing-library/user-event not installed**
- **Found during:** Task 1, writing test file
- **Issue:** Test used `userEvent.click()` but package not installed
- **Fix:** Replaced with `fireEvent.click()` from `@testing-library/react` (already installed)
- **Files modified:** src/__tests__/terminal/top-movers-panel.test.tsx
- **Commit:** part of 0c68977 (amended before RED commit)

## Known Stubs

None. All data flows from `getTopMoversAction()` → `topMovers` state → `TopMoversPanel` props. No hardcoded empty arrays in the rendered output (uses `?? []` as defaults only).

## Out of Scope (Deferred)

- `src/__tests__/moex-provider.test.ts` — 6 tests were already failing before this plan (pre-existing, unrelated to top-movers UI)

## Self-Check: PASSED
