---
phase: 09-data-pipeline-overhaul
plan: "06"
subsystem: backtest
tags: [backtest-kit, backtest, strategy, tdd]
dependency_graph:
  requires: []
  provides: [working-backtest-execution-path]
  affects: [backtest-actions, backtest-service, strategy-repository]
tech_stack:
  added: []
  patterns: [async-generator-consumption, tdd-red-green]
key_files:
  created: []
  modified:
    - src/server/services/backtest-service.ts
    - src/server/actions/backtest-actions.ts
    - src/__tests__/backtest-service.test.ts
    - src/server/repositories/strategy-repository.ts
decisions:
  - "BacktestService.runBacktest() registers a unique dynamic strategy schema per call (bt-{ts}-{rand}) to avoid global name collisions in backtest-kit"
  - "entryConditions JSON payload carries risks.takeProfit and risks.stopLoss for getSignal TP/SL computation — full indicator evaluation deferred to AI backtest preview phase"
  - "findById updated to accept optional userId for ownership filtering — backtest action enforces userId ownership at repository level"
metrics:
  duration: "5 min"
  completed_date: "2026-03-27T08:15:47Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 09 Plan 06: BacktestService Implementation Summary

BacktestService.runBacktest() implemented via backtest-kit Backtest.run() async generator with StrategyConfig condition serialization wired in runBacktestAction.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| T1 RED | Failing tests for runBacktest() | 2e5922b | backtest-service.test.ts |
| T1 GREEN | Implement BacktestService.runBacktest() | abf9c16 | backtest-service.ts |
| T2 | Wire strategy config into runBacktestAction | da4e6ee | backtest-actions.ts, strategy-repository.ts |

## What Was Built

**BacktestService.runBacktest()** (src/server/services/backtest-service.ts):
- Generates unique strategy name per call: `bt-{Date.now()}-{random}`
- Registers dynamic strategy schema via `addStrategySchema` with interval from params
- `getSignal` callback parses entryConditions JSON for TP/SL percentages, returns ISignalDto with `position: "long"`
- Consumes `Backtest.run()` async generator to completion
- Calls `Backtest.getData()` for BacktestStatisticsModel
- Maps: `totalSignals→totalTrades`, `winRate??0`, `totalPnl??0`, `sharpeRatio??0`
- Calculates `maxDrawdown` from `signalList[].pnl.pnlPercentage` peak-to-trough sequence

**runBacktestAction** (src/server/actions/backtest-actions.ts):
- Fetches strategy by `id + userId` (ownership enforced)
- Serializes `strategy.config.entry/exit/risks` as JSON to pass to BacktestService
- Defaults `instrumentId` and `interval` from strategy row when not overridden in input

**StrategyRepository.findById** updated to accept optional `userId` parameter for ownership filtering.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `getSignal` callback always returns `position: "long"` with TP/SL computed from percentage risks, not from actual indicator evaluation. Full indicator-based signal evaluation is deferred to the AI backtest preview phase per plan specification.

## Self-Check

- [x] src/server/services/backtest-service.ts — modified, contains Backtest.run, addStrategySchema, no "Not implemented"
- [x] src/server/actions/backtest-actions.ts — modified, contains StrategyRepository, config.entry, no empty string hardcodes
- [x] src/__tests__/backtest-service.test.ts — modified, 12 tests all passing
- [x] Commits: 2e5922b, abf9c16, da4e6ee — all present

## Self-Check: PASSED
