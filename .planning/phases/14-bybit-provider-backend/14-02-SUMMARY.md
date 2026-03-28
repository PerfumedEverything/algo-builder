---
phase: 14-bybit-provider-backend
plan: 02
subsystem: api
tags: [tinkoff, t-invest, portfolio, fifo, operations, broker]

# Dependency graph
requires:
  - phase: 12-data-accuracy
    provides: FifoCalculator for per-lot breakdown, which is retained for lots field
provides:
  - TinkoffProvider.getPortfolio using API-native averagePositionPriceFifo and expectedYieldFifo
  - getOperationsByCursor replacing getOperations for operations fetch
  - FifoCalculator demoted to lots-only computation
affects: [bybit-provider, portfolio-display, position-accuracy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "API-native first: prefer broker-reported P&L over custom recalculations"
    - "getOperationsByCursor with limit 1000 and hasNext warning for MVP pagination"

key-files:
  created: []
  modified:
    - src/server/providers/broker/tinkoff-provider.ts

key-decisions:
  - "averagePositionPriceFifo > 0 check with fallback to averagePositionPrice — handles sandbox/old accounts without FIFO data"
  - "expectedYieldFifo || manual fallback — preserves correctness when API field absent"
  - "FifoCalculator.calculateSummary kept for lots field only — per-lot breakdown still useful for UI"
  - "hasNext=true logs warning but does not paginate — MVP covers accounts with <1000 ops/year"
  - "placeOrder/cancelOrder stub methods added to TinkoffProvider to satisfy BrokerProvider interface extended by parallel agent (14-03)"

patterns-established:
  - "Broker-reported aggregate values take precedence over locally computed ones"

requirements-completed: [BYBIT-02]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 14 Plan 02: T-Invest API-Native P&L Fields Summary

**TinkoffProvider.getPortfolio refactored to use broker-reported averagePositionPriceFifo + expectedYieldFifo; getOperations replaced by getOperationsByCursor; FifoCalculator demoted to lots-only**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T12:41:35Z
- **Completed:** 2026-03-28T12:49:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced FifoCalculator aggregate avg price with `averagePositionPriceFifo` from T-Invest API (eliminates FIFO drift vs broker figures)
- Replaced manual `(currentPrice - avgPrice) * qty` with `expectedYieldFifo` from API (broker's own unrealized P&L)
- Switched `getOperations` (deprecated endpoint) to `getOperationsByCursor` with limit 1000, proper `OperationItem` field mapping, and `hasNext` overflow warning
- FifoCalculator retained for `lots` field only (per-lot breakdown table)
- Task 2 (`operation-service.ts`) verified: file doesn't call T-Invest API directly, no changes needed

## Task Commits

1. **Task 1: Refactor TinkoffProvider.getPortfolio to use API-native fields** - `43a5ed0` (feat)
2. **Task 2: Verify OperationService** - no commit needed (file unchanged, confirmed pure paper-trading service)

## Files Created/Modified

- `src/server/providers/broker/tinkoff-provider.ts` - averagePositionPriceFifo, expectedYieldFifo, getOperationsByCursor, placeOrder/cancelOrder stubs

## Decisions Made

- `averagePositionPriceFifo > 0` fallback to `averagePositionPrice` — handles sandbox accounts that may not have FIFO price
- `expectedYieldFifo || manual fallback` — preserves backward compatibility when API field absent (e.g. new positions)
- Portfolio-level `expectedYieldRelative` field does not exist in T-Invest API types — kept the existing manual percentage formula using `expectedYield` (Quotation)
- `getOperationsByCursor` filter to BUY/SELL types only, removing need to check operationType in the loop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added placeOrder/cancelOrder stubs to TinkoffProvider**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Parallel agent (14-03) extended BrokerProvider interface with placeOrder/cancelOrder; TinkoffProvider TS error TS2420
- **Fix:** Added stub methods that throw NotImplementedError
- **Files modified:** src/server/providers/broker/tinkoff-provider.ts
- **Verification:** `npx tsc --noEmit` produces no errors for tinkoff-provider.ts
- **Committed in:** 43a5ed0

**2. [Note] expectedYieldRelative does not exist in T-Invest API**
- Plan mentioned `res.expectedYieldRelative` but this field is absent from PortfolioResponse type
- Kept existing manual formula: `(expectedYieldAbs / (totalAmount - expectedYieldAbs)) * 100`
- This is factually correct — the broker's `expectedYield` Quotation field represents something different

---

**Total deviations:** 1 auto-fixed (blocking), 1 plan correction (missing API field)
**Impact on plan:** Stub fix required for compile; API field absence doesn't affect core goal of using per-position FIFO fields.

## Issues Encountered

- `expectedYieldRelative` from plan research (RESEARCH.md D-07) does not exist in the actual T-Invest SDK types. Portfolio-level yield percentage kept as manual formula. The per-position fields (averagePositionPriceFifo, expectedYieldFifo) were correct and work as expected.

## Known Stubs

- `TinkoffProvider.placeOrder` — throws NotImplementedError; real T-Invest order placement deferred to future phase
- `TinkoffProvider.cancelOrder` — throws NotImplementedError; same

## Next Phase Readiness

- T-Invest portfolio P&L now uses broker-authoritative values, eliminating FIFO drift
- FifoCalculator remains available for per-lot breakdown UI
- Ready for 14-03 (Bybit provider implementation) which already extended BrokerProvider interface

---
*Phase: 14-bybit-provider-backend*
*Completed: 2026-03-28*
