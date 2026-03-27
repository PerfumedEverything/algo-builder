# Deferred Items — Phase 09 Data Pipeline Overhaul

## Pre-existing Test Failures (out of scope for 09-05)

These failures existed before plan 09-05 and were not caused by any changes in this phase:

### src/__tests__/moex-provider.test.ts (6 tests failing)
- `getImoexCandles > maps response columns to MOEXCandle objects correctly`
- `getImoexCandles > caches result in Redis with 24h TTL`
- `getDividends > maps response columns to DividendData objects correctly`
- `getDividends > caches dividends with 7-day TTL`
- `getHistoryWithPagination > handles multi-page responses`
- `getHistoryWithPagination > handles single-page response`

**Likely cause:** Mock setup mismatch in MOEXProvider tests — possibly related to Redis/fetch mock expectations changed during pipeline migration.

### src/__tests__/operation-actions.test.ts (4 tests failing)
- `getPaperPortfolioAction — never skips rows > includes strategy with missing instrument as '—'`
- `getPaperPortfolioAction — never skips rows > includes strategy when price fetch throws`
- `getPaperPortfolioAction — never skips rows > includes strategy with 0 operations`
- `getPaperPortfolioAction — never skips rows > includes all strategies regardless of operations count`

**Likely cause:** Server action mock or cache interaction changed between planning phases.

**Action:** These should be addressed in a future cleanup phase or bug-fix plan.
