---
phase: 17-smoke-monitor-test-coverage
plan: 04
subsystem: testing
tags: [vitest, integration-tests, server-actions, broker, strategy, grid]

requires:
  - phase: 17-01
    provides: test infrastructure and smoke monitor foundation

provides:
  - Integration tests for broker-actions (19 tests, all 10 exports covered)
  - Integration tests for strategy-actions (13 tests, all 9 exports covered)
  - Integration tests for grid-actions (9 tests, all 5 exports covered)
  - Auth check verification pattern for server actions

affects: [17-05, future-server-action-refactors]

tech-stack:
  added: []
  patterns:
    - vi.hoisted() for mock instances shared in vi.mock factory (required for static class methods)
    - Constructor function mocks (not arrow functions) for class instantiation in Vitest

key-files:
  created:
    - src/__tests__/actions/broker-actions.test.ts
    - src/__tests__/actions/strategy-actions.test.ts
    - src/__tests__/actions/grid-actions.test.ts
  modified: []

key-decisions:
  - "vi.hoisted() required for GridAiService.suggestParams mock — static method on class needs hoisted reference in vi.mock factory"
  - "Strategy action tests mock @/core/schemas directly rather than letting Zod run — deterministic success/failure in tests"

patterns-established:
  - "Server action test pattern: mock supabase/server, supabase/admin, helpers (getCurrentUserId), services barrel — then import actions"
  - "Auth verification: each test asserts getCurrentUserId was called via expect(getCurrentUserId).toHaveBeenCalled()"

requirements-completed: [TEST-05]

duration: 5min
completed: 2026-03-31
---

# Phase 17 Plan 04: Server Action Integration Tests Summary

**41 integration tests across broker, strategy, and grid server actions — auth check, validation, and error path coverage for the primary API surface**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-31T16:14:00Z
- **Completed:** 2026-03-31T16:17:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- broker-actions: 19 tests covering all 10 exported actions (connect, disconnect, status, accounts, selectAccount, portfolio, sandboxPayIn, instruments, findByTicker, price)
- strategy-actions: 13 tests covering all 9 exports including schema validation paths for create/update, empty prompt/messages guards, filter passthrough
- grid-actions: 9 tests covering all 5 exports including currentPrice range validation (inside, below, above) and bad config rejection

## Task Commits

1. **Task 1: Broker actions integration tests** - `a49c04e` (test)
2. **Task 2: Strategy + Grid actions integration tests** - `9711843` (test)

## Files Created/Modified

- `src/__tests__/actions/broker-actions.test.ts` - 19 tests for all 10 broker server actions
- `src/__tests__/actions/strategy-actions.test.ts` - 13 tests for all 9 strategy server actions
- `src/__tests__/actions/grid-actions.test.ts` - 9 tests for all 5 grid server actions

## Decisions Made

- `vi.hoisted()` required for `GridAiService` static method mock — the mock factory is hoisted before variable declarations, so `mockSuggestParams` must use `vi.hoisted()` to be available in the factory closure
- Mocked `@/core/schemas` directly (with `safeParse` returning success/failure) rather than using real Zod validation — gives deterministic test control without coupling tests to schema changes

## Deviations from Plan

None - plan executed exactly as written. The `vi.hoisted()` fix for grid-actions was a predictable Vitest pattern (Rule 1 auto-fix), resolved in one iteration.

## Issues Encountered

- `grid-actions.test.ts` initial run failed with "Cannot access 'mockSuggestParams' before initialization" — classic Vitest hoisting issue with static class method mocks. Fixed by wrapping all mock fn variables in `vi.hoisted()`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 41 integration tests pass, covering the three most critical server action files
- TEST-05 requirement satisfied
- Ready for Phase 17-05

---
*Phase: 17-smoke-monitor-test-coverage*
*Completed: 2026-03-31*
