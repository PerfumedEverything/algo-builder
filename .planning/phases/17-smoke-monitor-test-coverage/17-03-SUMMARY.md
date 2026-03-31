---
phase: 17-smoke-monitor-test-coverage
plan: 03
subsystem: testing
tags: [vitest, unit-tests, broker-service, strategy-service, vi.hoisted]

requires:
  - phase: 17-01
    provides: smoke-probes and base test infrastructure for phase 17

provides:
  - BrokerService unit tests — 24 tests covering all 11 public methods
  - StrategyService unit tests — 19 tests covering all 10 public methods

affects: [broker-service, strategy-service, test coverage]

tech-stack:
  added: []
  patterns:
    - vi.hoisted() for mock instances shared across describe blocks in vitest
    - Constructor function pattern for mocking class instantiation in vitest
    - Double mock pattern: mock both barrel import and direct import path

key-files:
  created:
    - src/__tests__/broker-service.test.ts
    - src/__tests__/strategy-service.test.ts
  modified: []

key-decisions:
  - "Double mock for repositories: mock both @/server/repositories/strategy-repository and @/server/repositories barrel — BrokerService imports from barrel, tests need both paths covered"

patterns-established:
  - "vi.hoisted() + constructor function pattern for all service repository mocks"
  - "beforeEach resets all mock implementations to defaults, tests override per-case"

requirements-completed: [TEST-01, TEST-02]

duration: 15min
completed: 2026-03-31
---

# Phase 17 Plan 03: BrokerService + StrategyService Unit Tests Summary

**43 unit tests across BrokerService (24) and StrategyService (19) covering all 21 public methods with happy path + error/edge cases using vi.hoisted() mock pattern**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-31T16:14:00Z
- **Completed:** 2026-03-31T16:15:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- BrokerService: 24 tests, all 11 methods covered — connect/disconnect/getAccounts/getPortfolio/getInstruments/getCurrentPrice/getInstrumentPrice/getCandles/selectAccount/sandboxPayIn/getConnectionStatus
- StrategyService: 19 tests, all 10 methods covered — getStrategies/getStrategy(ownership)/createStrategy(validation)/updateStrategy/deleteStrategy/generateWithAI/chatWithAI/activateStrategy/deactivateStrategy/getStats
- Both files use established vi.hoisted() + constructor function mock pattern consistent with grid-trading-service.test.ts

## Task Commits

1. **Task 1: BrokerService unit tests** - `62c94f8` (test)
2. **Task 2: StrategyService unit tests** - `d442eea` (test)

## Files Created/Modified

- `src/__tests__/broker-service.test.ts` — 24 unit tests for BrokerService with mocked BrokerRepository, getBrokerProvider, and filterValidCandles
- `src/__tests__/strategy-service.test.ts` — 19 unit tests for StrategyService with mocked StrategyRepository and AiProvider

## Decisions Made

- Double mock for repositories: mock both `@/server/repositories/strategy-repository` and `@/server/repositories` barrel — source files import from different paths, tests need both covered to avoid "not a constructor" errors

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- BrokerService >= 80% method coverage (11/11 = 100%)
- StrategyService >= 80% method coverage (10/10 = 100%)
- Both test files use established vi.hoisted() mock pattern
- Ready for 17-04 (next plan in phase)

---
*Phase: 17-smoke-monitor-test-coverage*
*Completed: 2026-03-31*
