---
phase: 03-mvp-polish-fundamentals
plan: 02
subsystem: ui
tags: [terminal, strategies, signals, routing, ticker-cleanup]

# Dependency graph
requires:
  - phase: 02.3-strategy-portfolio-hardening
    provides: cleanTicker utility in ticker-utils.ts

provides:
  - Terminal "Создать стратегию" and "Создать сигнал" buttons with createFor routing
  - Strategies page auto-opens dialog from createFor query param
  - Signals page auto-opens dialog from createFor query param
  - Signal actions strip @ suffix from instrument on save

affects: [signals, strategies, terminal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createFor query param pattern for cross-page dialog auto-open"
    - "cleanTicker applied at server action boundary for signals"

key-files:
  created: []
  modified:
    - src/app/(dashboard)/terminal/page.tsx
    - src/app/(dashboard)/strategies/page.tsx
    - src/app/(dashboard)/signals/page.tsx
    - src/server/actions/signal-actions.ts

key-decisions:
  - "createFor param cleared from URL via window.history.replaceState after dialog opens — prevents re-open on refresh"
  - "cleanTicker applied in signal-actions.ts (server action boundary) — mirrors strategy-checker.ts pattern"
  - "POL-04 (Terminal sidebar position) verified as already done — no-op"
  - "POL-05 (portfolio chart 1d config) verified — terminal PERIOD_CONFIG already has 1d=365days; portfolio-view.tsx has no chart config to fix"

patterns-established:
  - "createFor query param: terminal routes to /strategies?createFor=TICKER, page reads param via useSearchParams and auto-opens dialog"

requirements-completed: [POL-03, POL-04, POL-05, POL-06, POL-09]

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 03 Plan 02: Terminal-to-Strategy/Signal Flow + Signal cleanTicker Fix Summary

**Terminal action buttons routing to strategy/signal creation with createFor param, and signal save stripping @ suffix using cleanTicker at action boundary**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-25T15:05:00Z
- **Completed:** 2026-03-25T15:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added "Создать стратегию" and "Создать сигнал" buttons in terminal toolbar (visible when instrument selected)
- Strategies and signals pages auto-open creation dialog when navigated from terminal via createFor param
- Signal creation and update now apply cleanTicker to strip @ suffix before saving to DB
- Verified POL-04 (Terminal at sidebar index 1) already satisfied — no changes needed
- Verified POL-05 (portfolio chart 1d config) already correct in terminal — no changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Terminal action buttons + strategies/signals createFor param** - `e708777` (feat)
2. **Task 2: Signal cleanTicker fix (POL-03)** - `7898986` (fix)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `src/app/(dashboard)/terminal/page.tsx` - Added useRouter, Plus/Bell icons, Button imports; added two action buttons in toolbar when instrument is selected
- `src/app/(dashboard)/strategies/page.tsx` - Added useSearchParams; useEffect reads createFor param and auto-opens StrategyDialog; clears URL param
- `src/app/(dashboard)/signals/page.tsx` - Added useSearchParams; useEffect reads createFor param and auto-opens SignalDialog; clears URL param
- `src/server/actions/signal-actions.ts` - Imported cleanTicker; applied to instrument in createSignalAction and updateSignalAction

## Decisions Made
- `createFor` URL param cleared via `window.history.replaceState({}, "", "/strategies")` after dialog opens — prevents dialog re-opening on page refresh
- `cleanTicker` applied in the server action layer (not the service layer) — consistent with where other input cleaning happens; mirrors the pattern in strategy-checker.ts
- POL-04 already complete (Terminal at sidebar index 1): verified in sidebar.tsx line 33, no change needed
- POL-05 already correct in terminal: `"1d": { days: 365, interval: "1d" }` — portfolio-view.tsx has no PERIOD_CONFIG so POL-05 was already satisfied

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures in `moex-provider.test.ts` (6 tests) unrelated to this plan's changes — confirmed by running tests against HEAD~2. Out of scope per deviation rules.

## Known Stubs

None.

## Next Phase Readiness
- Terminal-to-strategy/signal creation flow complete
- Signal @ suffix bug fixed at action boundary
- Ready for remaining Phase 03 plans (fundamental analysis, skeleton loading, etc.)

---
*Phase: 03-mvp-polish-fundamentals*
*Completed: 2026-03-25*
