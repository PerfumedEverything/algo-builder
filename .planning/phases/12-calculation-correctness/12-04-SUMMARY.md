---
phase: 12-calculation-correctness
plan: "04"
subsystem: ui
tags: [strategy-card, portfolio, operations, pnl, testing, vitest]

requires:
  - phase: 12-calculation-correctness
    provides: Research context for calculation correctness fixes (CALC-14 through CALC-17)

provides:
  - Strategy card Позиция shows cost basis (initialAmount) not mark-to-market (currentAmount)
  - Tests proving portfolio amounts = sum of real BUY operations, not budget
  - Verified paper-portfolio-view.tsx correctly aggregates totalInitial from stats.initialAmount

affects:
  - strategy-card
  - paper-portfolio-view
  - portfolio analytics

tech-stack:
  added: []
  patterns:
    - "TDD: write failing test first, then fix source, then verify all pass"
    - "Strategy card Позиция = initialAmount (cost basis), never currentAmount (mark-to-market)"

key-files:
  created:
    - src/__tests__/portfolio-amounts.test.ts
  modified:
    - src/components/strategy/strategy-card.tsx

key-decisions:
  - "Позиция line shows stats.initialAmount (sum of all BUY amounts) — not stats.currentAmount (holdingQty * currentPrice)"
  - "paper-portfolio-view.tsx was already correct — no change needed"

patterns-established:
  - "CALC-15: strategy card Позиция = initialAmount from operations"
  - "CALC-14/16/17: portfolio size and P&L% use real BUY amounts, not budget config"

requirements-completed:
  - CALC-14
  - CALC-15
  - CALC-16
  - CALC-17

duration: 3min
completed: 2026-03-28
---

# Phase 12 Plan 04: Portfolio Amount Correctness Summary

**Strategy card Позиция now shows cost basis (initialAmount = sum of BUY ops) instead of mark-to-market, with 6 tests covering CALC-14 through CALC-17**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-28T10:32:41Z
- **Completed:** 2026-03-28T10:35:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Fixed strategy-card.tsx line 131: changed `stats.currentAmount` to `stats.initialAmount` for "Позиция" display
- Created portfolio-amounts.test.ts with 6 tests covering all 4 CALC requirements
- Confirmed paper-portfolio-view.tsx was already correct (totalInitial from stats.initialAmount)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write portfolio amounts tests and fix strategy card** - `f28b071` (fix)

**Plan metadata:** to be added in final commit

_Note: TDD task — RED (tests written, CALC-15 failed), GREEN (strategy-card fixed, all 6 pass)_

## Files Created/Modified
- `src/__tests__/portfolio-amounts.test.ts` - 6 tests for CALC-14, CALC-15, CALC-16, CALC-17 + key_link verification
- `src/components/strategy/strategy-card.tsx` - Single line change: currentAmount → initialAmount on Позиция line

## Decisions Made
- Strategy card "Позиция" must show initialAmount (cost basis = sum of all BUY operations), not currentAmount (mark-to-market = holdingQty * currentPrice). Users need truthful invested amount for real money decisions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CALC-14 through CALC-17 complete and verified
- Portfolio shows real invested amounts, not budget configuration
- Strategy card correctness proven via automated tests

---
*Phase: 12-calculation-correctness*
*Completed: 2026-03-28*
