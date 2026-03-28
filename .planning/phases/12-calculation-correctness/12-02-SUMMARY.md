---
phase: 12-calculation-correctness
plan: 02
subsystem: testing
tags: [fifo, candle-validation, tdd, vitest, broker-service]

requires:
  - phase: 12-01
    provides: FIFO calculator and candle types already in place

provides:
  - validateOHLC pure function rejecting broken candles (high<low, negative volume, future timestamp)
  - filterValidCandles with warn logging integrated into BrokerService.getCandles
  - 6 CALC-07 spec scenarios with exact kopek-level numbers
  - CALC-08 average entry price verified with 5@100 + 5@120 = avgPrice 110
  - CALC-09 unrealized P&L on partial close verified

affects:
  - Any phase using BrokerService.getCandles (candles now pre-filtered)
  - Any phase extending FIFO test coverage

tech-stack:
  added: []
  patterns:
    - "TDD Red-Green: test written first against non-existent module, then implementation"
    - "Candle validator pure function pattern: validateOHLC + filterValidCandles separation"

key-files:
  created:
    - src/server/services/candle-validator.ts
    - src/__tests__/candle-validator.test.ts
  modified:
    - src/server/services/broker-service.ts
    - src/__tests__/fifo-calculator.test.ts

key-decisions:
  - "validateOHLC checks 5 invariants: high>=low, high>=open, high>=close, low<=open, low<=close, volume>=0, time not future"
  - "filterValidCandles uses console.warn with [CandleValidator] prefix for traceability"
  - "BrokerService.getCandles pipes provider output through filterValidCandles before returning"
  - "FIFO realized P&L for full-close scenarios deferred to OperationService.getStats — FifoCalculator only tracks unrealized"

patterns-established:
  - "Candle validation: always filter at BrokerService layer, not at callers"
  - "FIFO spec scenarios: numbered Scenario 1-6 in dedicated describe block per CALC-07"

requirements-completed: [CALC-04, CALC-05, CALC-06, CALC-07, CALC-08, CALC-09]

duration: 5min
completed: 2026-03-28
---

# Phase 12 Plan 02: Candle Validation + FIFO Spec Scenarios Summary

**validateOHLC pure function + BrokerService integration filtering broken candles, plus 6 named FIFO spec scenarios with exact kopek numbers for CALC-04 through CALC-09**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T10:32:00Z
- **Completed:** 2026-03-28T10:34:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `candle-validator.ts` with `validateOHLC` (5 invariants) and `filterValidCandles` (with warn logging)
- Integrated `filterValidCandles` into `BrokerService.getCandles` — all broker candles now pre-validated
- Added CALC-07 describe block with 6 explicitly named spec scenarios (Scenario 1-6) with exact numbers
- Added CALC-08 test: 5@100 + 5@120 => avgPrice = 110 verified
- Added CALC-09 test: unrealized P&L = 90 on partial close verified
- 33 total tests passing (8 new candle-validator + 9 new FIFO spec)

## Task Commits

1. **Task 1: Candle validation + BrokerService integration** - `d8b35c3` (feat)
2. **Task 2: FIFO 6 spec scenarios** - `02015f7` (test)

## Files Created/Modified

- `src/server/services/candle-validator.ts` - validateOHLC + filterValidCandles pure functions
- `src/__tests__/candle-validator.test.ts` - 8 tests for 3 broken candle types + filter behavior
- `src/server/services/broker-service.ts` - Added filterValidCandles import + call in getCandles
- `src/__tests__/fifo-calculator.test.ts` - Added CALC-07/08/09 describe blocks (9 new tests)

## Decisions Made

- `validateOHLC` checks 5 OHLC invariants: high>=low, high>=open/close, low<=open/close, volume>=0, time not future
- `filterValidCandles` uses `console.warn("[CandleValidator] filtered broken candle", ...)` for log traceability
- FIFO realized P&L for fully-closed positions is deferred to `OperationService.getStats` — `FifoCalculator` only computes unrealized P&L on remaining lots. Scenarios 1, 2, 5 verify lot count goes to 0 but don't assert realized P&L (that lives in OperationService layer).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. FifoCalculator already implemented correctly — all 6 CALC-07 spec scenarios passed on first run without any fixes needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CALC-04, CALC-05, CALC-06, CALC-07, CALC-08, CALC-09 all verified
- `BrokerService.getCandles` now safe against corrupt broker data
- Phase 12 plans 03 and 04 can proceed with confidence that candle data is pre-validated

---
*Phase: 12-calculation-correctness*
*Completed: 2026-03-28*
