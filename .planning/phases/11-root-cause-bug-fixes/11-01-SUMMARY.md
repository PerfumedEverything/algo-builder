---
phase: 11-root-cause-bug-fixes
plan: 01
subsystem: ui
tags: [ai-wizard, strategy, sse, use-ai-stream, quick-action, strategy-lifecycle]

requires:
  - phase: 08-ai-assistant-upgrade
    provides: useAiStream hook, AiChat component, forceCreate path

provides:
  - sendMessage returns AiGeneratedStrategy | undefined so callers can act on it
  - handleQuickAction CREATE path calls onGenerated, advancing wizard to form step
  - deleteStrategy deactivates (PAUSED) before removing DB row

affects: [ai-wizard-dialog, strategy-lifecycle, strategy-checker]

tech-stack:
  added: []
  patterns:
    - "Hook returns data from SSE stream so caller component can drive navigation"
    - "Pre-delete deactivation guard: set PAUSED before delete to prevent in-flight checker races"

key-files:
  created: []
  modified:
    - src/hooks/use-ai-stream.ts
    - src/components/strategy/ai-chat.tsx
    - src/server/services/strategy-service.ts

key-decisions:
  - "sendMessage return value (not a new SSE event) surfaces pendingStrategy to callers — minimal API change"
  - "onGenerated wiring kept in component (ai-chat.tsx), not in hook — hook stays navigation-agnostic"
  - "PAUSED before delete is sufficient defense-in-depth for paper trading (no real broker orders to cancel)"

patterns-established:
  - "Quick action path (forceCreate) now converges to same onGenerated endpoint as inline Apply button"

requirements-completed: [RCBF-01, RCBF-05]

duration: 5min
completed: 2026-03-28
---

# Phase 11 Plan 01: AI Wizard Quick Action + Safe Strategy Delete Summary

**sendMessage now returns pendingStrategy so handleQuickAction CREATE advances the wizard to form step, and deleteStrategy sets PAUSED before removing the DB row**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T07:54:00Z
- **Completed:** 2026-03-28T07:59:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Fixed RCBF-01: "Создать эту стратегию" quick action now advances AI wizard to form step via onGenerated callback
- Fixed RCBF-05: deleteStrategy now sets status PAUSED before removing row, preventing orphan checker state
- No new TypeScript errors introduced (pre-existing test file errors only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire AI quick action CREATE to call onGenerated via sendMessage return value** - `122df9b` (feat)
2. **Task 2: Add pre-delete deactivation in strategy-service.ts** - `3d2ce21` (fix)

## Files Created/Modified

- `src/hooks/use-ai-stream.ts` - sendMessage return type changed from Promise<void> to Promise<AiGeneratedStrategy | undefined>; returns pendingStrategy after finally block
- `src/components/strategy/ai-chat.tsx` - handleQuickAction awaits sendMessage for CREATE action; calls setFromAI + onGenerated + setApplied if strategy returned
- `src/server/services/strategy-service.ts` - deleteStrategy: added repository.update(id, userId, { status: "PAUSED" }) before repository.delete

## Decisions Made

- `sendMessage` return value was chosen over a new callback parameter (`onStrategyReady`) because it is the minimal API surface change and avoids adding hook params
- `onGenerated` wiring kept in `ai-chat.tsx` (component layer), not inside the hook — per Research pitfall #1, the hook must not know about wizard navigation
- PAUSED-before-delete is sufficient for paper trading scope; no broker cancel step needed (no real orders)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors exist in `src/__tests__/` files but are unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RCBF-01 and RCBF-05 complete. Phase 11 Plans 02 and 03 can proceed independently.
- Quick action CREATE path and deleteStrategy lifecycle are both clean.

---
*Phase: 11-root-cause-bug-fixes*
*Completed: 2026-03-28*
