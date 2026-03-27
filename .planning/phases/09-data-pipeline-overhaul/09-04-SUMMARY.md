---
phase: 09-data-pipeline-overhaul
plan: 04
subsystem: api
tags: [backtest-kit, backtest, moex, tinkoff, slippage, fees, vitest]

requires:
  - phase: 09-01
    provides: trading-signals migration foundation and candle pipeline

provides:
  - BacktestService class with MOEX exchange schema (tinkoff-moex) and T-Invest slippage/fee config
  - runBacktestAction server action as production call site for BacktestService
  - Unit tests covering config, schema registration, and idempotency

affects: [strategy-backtesting, ai-backtest-preview, strategy-validation]

tech-stack:
  added: [backtest-kit@5.9.0]
  patterns:
    - Static singleton class with initialized guard for global backtest-kit state
    - addExchangeSchema wrapping Tinkoff candle API into backtest-kit OHLCV format
    - Server action with getCurrentUserId() auth check before BacktestService call

key-files:
  created:
    - src/server/services/backtest-service.ts
    - src/server/actions/backtest-actions.ts
    - src/__tests__/backtest-service.test.ts
  modified:
    - src/server/services/index.ts
    - package.json

key-decisions:
  - "BacktestService uses static class with initialized guard — backtest-kit registers global state, must not re-initialize per request"
  - "runBacktest() throws NotImplementedError for Phase 9 scope — full Backtest API integration deferred to AI backtest preview phase"
  - "CC_PERCENT_SLIPPAGE: 0.05 and CC_PERCENT_FEE: 0.03 match T-Invest MOEX fee structure"

patterns-established:
  - "Pattern: backtest-kit global state managed via static BacktestService.initialized flag"
  - "Pattern: exchange schema maps Tinkoff broker.getCandles() to backtest-kit OHLCV shape"

requirements-completed: [DPIPE-03]

duration: 8min
completed: 2026-03-27
---

# Phase 09 Plan 04: BacktestService Summary

**backtest-kit integrated as BacktestService singleton with tinkoff-moex exchange schema (0.05% slippage, 0.03% T-Invest fees) and runBacktestAction server action call site**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T10:29:00Z
- **Completed:** 2026-03-27T10:37:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Installed backtest-kit@5.9.0 and created BacktestService with MOEX exchange schema registration
- Static singleton initialization guard prevents duplicate addExchangeSchema/setConfig calls on re-render
- runBacktestAction server action provides production call site with auth guard (getCurrentUserId())
- 5 unit tests cover config values, schema registration, idempotency, and isInitialized lifecycle

## Task Commits

Each task was committed atomically:

1. **Task 1: Install backtest-kit and create BacktestService with MOEX exchange schema** - `2894627` (feat)
2. **Task 2: Create runBacktestAction server action** - `2bf74ec` (feat)
3. **Task 3: Create BacktestService unit tests** - `995e0ef` (test)

## Files Created/Modified
- `src/server/services/backtest-service.ts` - BacktestService class with MOEX exchange schema and T-Invest slippage/fee config
- `src/server/actions/backtest-actions.ts` - runBacktestAction server action with getCurrentUserId() auth
- `src/__tests__/backtest-service.test.ts` - 5 unit tests for config, schema, idempotency, isInitialized
- `src/server/services/index.ts` - Added BacktestService and BacktestResult/BacktestParams barrel exports
- `package.json` - Added backtest-kit@^5.9.0 dependency

## Decisions Made
- BacktestService uses static class pattern because backtest-kit registers global singleton state — re-initialization per request would throw duplicate schema errors
- `runBacktest()` throws "Not implemented" for Phase 9 scope; full Backtest.background() API integration is deferred to the AI backtest preview phase (requires file system and worker process design)
- T-Invest fee structure: 0.05% slippage and 0.03% commission, as documented in RESEARCH.md

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
- `BacktestService.runBacktest()` — throws NotImplementedError. This is intentional for Phase 9 scope. The method signature, types, and call site are all in place. Full implementation requires backtest-kit Backtest.background() API wiring in a dedicated worker process (see RESEARCH.md Pitfall 4 and Open Question 1). The `runBacktestAction` exercises the call site but will return an error until implemented.

## Next Phase Readiness
- BacktestService is ready for Phase 9 AI backtest preview — only `runBacktest()` body needs implementing
- tinkoff-moex exchange schema is registered and wired to the broker provider
- runBacktestAction provides the server action interface for future UI integration

## Self-Check: PASSED

- FOUND: src/server/services/backtest-service.ts
- FOUND: src/server/actions/backtest-actions.ts
- FOUND: src/__tests__/backtest-service.test.ts
- FOUND: commit 2894627 (feat: install backtest-kit and create BacktestService)
- FOUND: commit 2bf74ec (feat: create runBacktestAction server action)
- FOUND: commit 995e0ef (test: add BacktestService unit tests)

---
*Phase: 09-data-pipeline-overhaul*
*Completed: 2026-03-27*
