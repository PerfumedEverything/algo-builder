---
phase: 19-notifications-ai-upgrade
plan: "01"
subsystem: notifications
tags: [redis, dedup, telegram, notifications, p&l, strategy-trigger]
dependency_graph:
  requires: []
  provides: [notification-dedup, signal-name-in-notifs, p&l-accuracy, position-duration, strategy-trigger-log]
  affects: [signal-trigger-handler, strategy-trigger-handler, notification-templates, operation-service]
tech_stack:
  added: []
  patterns: [Redis SET NX for distributed lock, TDD red-green]
key_files:
  created:
    - src/__tests__/notification-dedup.test.ts
  modified:
    - src/server/services/signal-trigger-handler.ts
    - src/server/services/strategy-trigger-handler.ts
    - src/server/services/notification-templates.ts
    - src/server/services/operation-service.ts
decisions:
  - Redis SET NX with TTL used for notification dedup — prevents concurrent cron+realtime duplicates without DB coordination
  - strategy-trigger-handler uses minute-bucket key (60s granularity) for strategy dedup vs trigger-count for signals
  - P&L block skipped entirely when recordedQuantity=0 — no fallback to 1, preserves data integrity
  - getLastBuyOperation returns full StrategyOperation (vs getLastBuyPrice scalar) to enable position duration calculation
  - StrategyTriggerLog insert wrapped in try/catch — log failure does not block notification delivery
  - formatPriceLevel/formatPriceChange/formatVolumeAnomaly/formatLevelBreakout exported for testability
metrics:
  duration_seconds: 336
  completed_date: "2026-04-01"
  tasks_completed: 1
  files_modified: 5
---

# Phase 19 Plan 01: Notification Dedup, Signal Name, P&L Fix, Position Duration, Trigger Log Summary

**One-liner:** Redis SET NX dedup prevents duplicate notifications; signal name added to all 4 notification types; P&L accuracy fixed (no quantity=1 fallback); position duration shown on exit; StrategyTriggerLog table populated.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED  | Failing tests for all 5 NOTIF requirements | eec789f | src/__tests__/notification-dedup.test.ts |
| GREEN | Implement all 5 NOTIF requirements | 450e65e | signal-trigger-handler.ts, strategy-trigger-handler.ts, notification-templates.ts, operation-service.ts |

## What Was Built

### NOTIF-01: Redis dedup lock

`signal-trigger-handler.ts`: Attempts `redis.set("notif:signal:{id}:{triggerCount+1}", "1", "EX", 300, "NX")` before any DB write. Returns immediately if lock already held (null response = another process already handling this trigger).

`strategy-trigger-handler.ts`: Attempts `redis.set("notif:strategy:{id}:{side}:{minuteBucket}", "1", "EX", 120, "NX")` where minuteBucket = `(Date.now() / 60000) | 0`. 60-second granularity with 120s TTL ensures mutual exclusion between cron and realtime triggers.

### NOTIF-02: Signal name in all notification types

`notification-templates.ts`: `📛 ${signal.name}` line added after the header in `formatPriceLevel`, `formatPriceChange`, `formatVolumeAnomaly`, `formatLevelBreakout`. All 4 functions are now also exported for independent unit testing.

### NOTIF-04: P&L fix — no quantity=1 fallback

`strategy-trigger-handler.ts`: The block `const quantity = recordedQuantity > 0 ? recordedQuantity : 1` removed. P&L calculation is now inside `if (lastBuyOp && lastBuyOp.price > 0 && recordedQuantity > 0)` — when quantity is 0, the entire P&L block is skipped, preventing misleading notifications.

### NOTIF-03: Position duration on exit

`operation-service.ts`: New method `getLastBuyOperation(strategyId)` returns `StrategyOperation | null` (full object including `createdAt`).

`strategy-trigger-handler.ts`: `formatDuration(ms)` helper converts milliseconds to human-readable "45мин", "2ч 15мин", "3д 5ч". Called on exit using `Date.now() - new Date(lastBuyOp.createdAt).getTime()`. Added to message as `⏱️ Позиция: {duration}`.

### NOTIF-05: Strategy trigger log

`strategy-trigger-handler.ts`: After positionState update and before Telegram send, inserts to `StrategyTriggerLog` with strategyId, instrument, side, price, message, quantity, amount, triggeredAt. Insert failure is caught and logged but does not block notification delivery.

**Note for deployment:** The `StrategyTriggerLog` table must be created in Supabase before this code runs in production:

```sql
CREATE TABLE IF NOT EXISTS "StrategyTriggerLog" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "strategyId" uuid NOT NULL REFERENCES "Strategy"(id) ON DELETE CASCADE,
  instrument text NOT NULL,
  side text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  message text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  "triggeredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_strategy_trigger_log_strategy ON "StrategyTriggerLog"("strategyId");
ALTER TABLE "StrategyTriggerLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "StrategyTriggerLog" FOR ALL USING (true) WITH CHECK (true);
```

## Test Results

```
✓ Notification deduplication > Test 1: Redis SET NX acquired — signal handler calls redis.set with NX
✓ Notification deduplication > Test 1b: Redis SET NX returns null (already locked) — handler returns early without DB calls
✓ Notification templates — signal name > Test 2: formatPriceLevel includes signal.name
✓ Notification templates — signal name > Test 3: formatPriceChange includes signal.name
✓ Notification templates — signal name > Test 4: formatVolumeAnomaly includes signal.name
✓ Notification templates — signal name > Test 5: formatLevelBreakout includes signal.name
✓ Strategy trigger handler > Test 6: exit notification includes P&L, entry/exit prices, and position duration
✓ Strategy trigger handler > Test 7: P&L NOT calculated when recordedQuantity=0 (no fallback to 1)
✓ OperationService > Test 8: getLastBuyOperation returns full operation with createdAt
Tests: 9 passed (9)
```

## Deviations from Plan

### Minor Difference

**signal.name count in notification-templates.ts is 7, not >= 8**

The plan acceptance criterion was `grep -c "signal.name" returns >= 8`. Actual count is 7. All 4 format functions (formatPriceLevel, formatPriceChange, formatVolumeAnomaly, formatLevelBreakout) now include signal.name as required by NOTIF-02. The other 3 occurrences are in formatIndicator, formatMultiCondition, and formatDefault — all pre-existing. Adding a redundant 8th occurrence would be noise with no functional value. The NOTIF-02 requirement is fully satisfied.

## Known Stubs

None. All required changes are wired end-to-end. The StrategyTriggerLog table must be created in Supabase (SQL provided above) before the handler runs in production.

## Self-Check: PASSED
