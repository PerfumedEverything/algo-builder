---
phase: 14-bybit-provider-backend
plan: 04
subsystem: api
tags: [bybit-api, broker, provider, typescript, vitest, testnet, crypto]

requires:
  - phase: 14-01
    provides: BrokerProvider interface with placeOrder/cancelOrder, BybitProvider stub, getBrokerProvider factory

provides:
  - Full BybitBrokerProvider class — 10 methods implementing BrokerProvider interface
  - BYBIT_CRYPTO_PAIRS constant (8 top crypto pairs)
  - BYBIT_INTERVAL_MAP for timeframe conversion
  - 11 unit tests with mocked RestClientV5, all green

affects:
  - 14-05 (Bybit stream worker uses same provider class)
  - 14-06 (UI broker switch wires to this factory)

tech-stack:
  added: [bybit-api@4.6.1]
  patterns:
    - PositionV5 from bybit-api typed directly (not custom BybitPositionRaw)
    - vi.hoisted() for mock instance sharing across vi.mock factory hoisting
    - Module-level mapPosition() helper to keep class under 150 lines

key-files:
  created:
    - src/server/providers/broker/bybit-provider.ts
    - src/server/providers/broker/bybit-constants.ts
    - src/server/providers/broker/bybit-provider.test.ts
  modified:
    - package.json (bybit-api added)

key-decisions:
  - "PositionV5 from bybit-api used directly in mapPosition — avoids duplicate type definition"
  - "vi.hoisted() required for mock instance shared between vi.mock factory and test scope (vitest hoist limitation)"
  - "Regular function (not arrow) used for MockRestClientV5 in vi.mock — arrow functions cannot be constructors"
  - "mapPosition() extracted as module-level function to keep BybitProvider class under 150 lines"

patterns-established:
  - "bybit-provider pattern: RestClientV5 testnet: true, connect parses 'key:secret', ensureClient guard"
  - "Candle mapping pattern: res.result.list.reverse() + parseFloat for all string numeric fields"

requirements-completed: [BYBIT-01, BYBIT-02, BYBIT-03, BYBIT-04, BYBIT-05, BYBIT-06, BYBIT-14]

duration: 7min
completed: 2026-03-28
---

# Phase 14 Plan 04: BybitBrokerProvider Implementation Summary

**BybitBrokerProvider class with all 10 BrokerProvider methods using bybit-api RestClientV5 testnet, P&L direct from API, 11 green unit tests**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-28T12:54:54Z
- **Completed:** 2026-03-28T13:01:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Full `BybitProvider` class implementing all BrokerProvider interface methods (connect, disconnect, getAccounts, getPortfolio, getInstruments, getCandles, getCurrentPrice, getAvailableCash, placeOrder, cancelOrder)
- RestClientV5 with testnet: true per D-03 and D-14; connect parses "apiKey:apiSecret" format
- getPortfolio returns USDT totalEquity + positions with unrealisedPnl directly from Bybit API (no FIFO, per D-02)
- getCandles reverses result array (Bybit returns newest-first) and parseFloat all string fields
- 11 unit tests covering all methods with mocked RestClientV5 — all green

## Task Commits

1. **Task 1+2: BybitBrokerProvider implementation + unit tests** - `eafc85d` (feat)

## Files Created/Modified

- `src/server/providers/broker/bybit-provider.ts` — Full BybitProvider class (150 lines)
- `src/server/providers/broker/bybit-constants.ts` — BYBIT_CRYPTO_PAIRS + BYBIT_INTERVAL_MAP
- `src/server/providers/broker/bybit-provider.test.ts` — 11 unit tests with mocked RestClientV5
- `package.json` / `package-lock.json` — bybit-api@4.6.1 added

## Decisions Made

- Used `PositionV5` from bybit-api directly in `mapPosition` helper instead of defining `BybitPositionRaw`
- `vi.hoisted()` required because vitest hoists `vi.mock` calls before module-level variable declarations
- Used regular function (not arrow) for `MockRestClientV5` constructor mock — arrow functions cannot be used with `new`
- Extracted `mapPosition()` as module-level function to keep the class file exactly at 150 lines

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing bybit-api package**
- **Found during:** Task 1 (BybitBrokerProvider implementation)
- **Issue:** bybit-api not installed — package missing from package.json
- **Fix:** `npm install bybit-api`
- **Files modified:** package.json, package-lock.json
- **Verification:** `node -e "require('bybit-api')"` succeeds, RestClientV5 loads
- **Committed in:** eafc85d (Task 1 commit)

**2. [Rule 1 - Bug] Fixed vi.mock constructor TypeError with vi.hoisted**
- **Found during:** Task 2 (unit tests, TDD GREEN phase)
- **Issue:** `vi.mock("bybit-api", () => ({ RestClientV5: vi.fn(() => mockClientInstance) }))` threw "not a constructor" — arrow functions can't be used with `new`, and vitest hoists `vi.mock` before variable declarations
- **Fix:** Used `vi.hoisted()` to declare `mockClientInstance` before hoisting, used regular function `function MockRestClientV5() { return mockClientInstance }` for the constructor mock
- **Files modified:** src/server/providers/broker/bybit-provider.test.ts
- **Verification:** All 11 tests pass
- **Committed in:** eafc85d

---

**Total deviations:** 2 auto-fixed (1 missing dependency, 1 test mock bug)
**Impact on plan:** Both auto-fixes essential for correctness. No scope creep.

## Issues Encountered

- TypeScript error: `string` not assignable to `KlineIntervalV3` — fixed with type cast `as KlineIntervalV3` after importing the type from bybit-api
- TypeScript error: `getPositionInfo` result list typed as `PositionV5[]`, so `mapPosition` helper parameter type updated from custom `BybitPositionRaw` to `PositionV5`

## Known Stubs

None — all methods fully implemented.

## Next Phase Readiness

- BybitProvider is fully wired into the factory (from Plan 01) and ready for use
- Plan 05 (Bybit WebSocket stream worker) can use the same bybit-api package
- Testnet credentials required for live integration — connect("apiKey:apiSecret") format

## Self-Check: PASSED

- FOUND: src/server/providers/broker/bybit-provider.ts
- FOUND: src/server/providers/broker/bybit-constants.ts
- FOUND: src/server/providers/broker/bybit-provider.test.ts
- FOUND commit: eafc85d

---
*Phase: 14-bybit-provider-backend*
*Completed: 2026-03-28*
