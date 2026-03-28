---
phase: 11-root-cause-bug-fixes
plan: 03
subsystem: ui
tags: [portfolio, strategy-card, paper-trading, operation-stats]

requires:
  - phase: 06-analytics
    provides: OperationStats type with initialAmount/currentAmount/holdingQty fields
  - phase: 09-data-pipeline
    provides: BrokerService price fetching used in getOperationStatsForStrategiesAction

provides:
  - Paper portfolio table with quantity (holdingQty), cost basis (Затрачено), current market value (Текущая) columns
  - Strategy card shows cost basis fallback when live price unavailable (no "0₽" for open positions)
  - Strategies page portfolio summary uses actual invested amounts from operations, not budget settings

affects: [paper-portfolio, strategies-page, strategy-card, operation-stats]

tech-stack:
  added: []
  patterns:
    - "initialAmount as cost-basis fallback when currentAmount unavailable"
    - "Server action post-processing: apply fallback on stats before returning to client"

key-files:
  created: []
  modified:
    - src/components/broker/paper-portfolio-view.tsx
    - src/components/strategy/strategy-card.tsx
    - src/app/(dashboard)/strategies/page.tsx
    - src/server/actions/operation-actions.ts

key-decisions:
  - "Use initialAmount (sum of all BUY amounts) as currentAmount fallback — accounts for multiple buys at different prices, unlike lastBuyPrice * holdingQty"
  - "Apply fallback in server action (operation-actions.ts) as primary fix, add UI fallback in strategy-card as defense-in-depth"
  - "totalPortfolio in strategies page now uses totalInitial from opsStatsMap — actual invested, not config.risks.tradeAmount budget"

requirements-completed: [RCBF-03, RCBF-06, RCBF-07]

duration: 3min
completed: 2026-03-27
---

# Phase 11 Plan 03: Portfolio Amount Display Fixes Summary

**Paper portfolio gains quantity + current value columns; strategy card shows cost basis fallback instead of 0₽; strategies page portfolio summary uses actual invested amounts from operations**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T12:19:39Z
- **Completed:** 2026-03-27T12:22:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Paper portfolio table now shows holdingQty (Кол-во), clarified cost basis (Затрачено), and current market value (Текущая) for open positions
- Strategy card no longer shows "Позиция: 0.00₽" — falls back to initialAmount labeled "Позиция (по цене входа)"
- Server action applies initialAmount fallback when price fetch fails and holdingQty > 0
- Strategies page "Размер портфеля стратегий" shows actual invested capital from operations, not config budget setting

## Task Commits

1. **Task 1: Add quantity column and clarify amount labels in paper portfolio** - `01943d5` (feat)
2. **Task 2: Strategy card fallback and portfolio summary actual invested amounts** - `59a0d18` (fix)

## Files Created/Modified

- `src/components/broker/paper-portfolio-view.tsx` - Added Кол-во and Текущая columns, renamed Вложено to Затрачено, expanded grid cols 8→10
- `src/components/strategy/strategy-card.tsx` - Added UI fallback showing initialAmount with "по цене входа" label when currentAmount is 0
- `src/app/(dashboard)/strategies/page.tsx` - portfolioSummary.totalPortfolio now uses totalInitial from opsStatsMap; removed unused StrategyConfig import
- `src/server/actions/operation-actions.ts` - Post-processes stats to apply initialAmount as currentAmount fallback before returning to client

## Decisions Made

- Used `initialAmount` (sum of all BUY amounts) instead of `lastBuyPrice * holdingQty` as the fallback for `currentAmount`. Research pitfall #3 specifically flags this: initialAmount accounts for multiple buys at different prices, giving true cost basis.
- Applied the fallback at the server action level (not the service level) to keep OperationService pure and let the action decide presentation-level defaults.
- Added a second UI-level fallback in strategy-card as defense-in-depth even though the action-level fix should prevent the zero case.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in test files (`__tests__/fifo-calculator.test.ts`, `__tests__/operation-service.test.ts`) — unrelated to this plan's changes. Verified with targeted `tsc` check against modified files only (zero errors).

## Next Phase Readiness

- All three RCBF requirements satisfied: real amounts displayed (RCBF-03), quantity column present (RCBF-06), strategy card position consistent (RCBF-07)
- Paper portfolio now shows a complete picture: ops count, quantity, cost basis, current value, P&L

---
*Phase: 11-root-cause-bug-fixes*
*Completed: 2026-03-27*
