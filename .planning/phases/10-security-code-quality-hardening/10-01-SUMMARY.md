---
phase: 10-security-code-quality-hardening
plan: 01
subsystem: auth
tags: [security, auth, idor, middleware, server-actions, supabase]

# Dependency graph
requires:
  - phase: 06.1-analytics-data-quality
    provides: StrategyService.getStrategies used for ownership check
  - phase: 08-ai-assistant-deep-upgrade
    provides: terminal actions and operation actions this plan hardens
provides:
  - Auth-guarded getOrderBookAction and getTopMoversAction
  - IDOR-protected getOperationStatsForStrategiesAction with ownership filter
  - OperationRepository.findByStrategyId and getStatsByStrategyId with optional userId filter
  - Middleware narrowed to exact /api/signals/check and /api/signals/check-instrument paths
affects: [11-rate-limiting, future-api-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth guard: call getCurrentUserId() as first line in every server action try block"
    - "IDOR defense: load caller-owned entity IDs, filter client-supplied IDs through Set before use"
    - "Repository ownership: optional userId param with .eq filter — backward compatible"
    - "Middleware narrowing: exact pathname === over startsWith for cron-only bypass"

key-files:
  created: []
  modified:
    - src/server/actions/terminal-actions.ts
    - src/server/actions/operation-actions.ts
    - src/server/repositories/operation-repository.ts
    - src/lib/supabase/middleware.ts

key-decisions:
  - "userId param in repository methods is optional to preserve backward compatibility with signal checker / strategy checker that verify ownership upstream"
  - "Middleware bypass uses exact pathname === for /api/signals/check and /api/signals/check-instrument — not startsWith to prevent future path injection"
  - "IDOR fix: load user's own strategy IDs via StrategyService, filter client-supplied IDs through Set — validIds used for both price map and stats query"

patterns-established:
  - "Auth-first pattern: getCurrentUserId() as first statement in every server action try block"
  - "Ownership filter pattern: load owned IDs → Set → filter client IDs → use validIds downstream"

requirements-completed: [SEC-01, SEC-04, SEC-06, SEC-07]

# Metrics
duration: 13min
completed: 2026-03-27
---

# Phase 10 Plan 01: Security Hardening — Auth Bypass, IDOR, Repository Ownership, Middleware Summary

**Closed 4 critical security vulnerabilities: unauthenticated terminal actions, IDOR in batch strategy stats, unfiltered repository queries, and over-broad middleware cron bypass**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-27T11:00:04Z
- **Completed:** 2026-03-27T11:13:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- getOrderBookAction and getTopMoversAction now reject unauthenticated callers via getCurrentUserId()
- getOperationStatsForStrategiesAction filters client-supplied strategyIds against caller-owned strategies — eliminates cross-user data leakage
- OperationRepository.findByStrategyId and getStatsByStrategyId accept optional userId and apply .eq("userId", userId) when provided
- Middleware signal bypass narrowed from startsWith("/api/signals") to exact path matches for /api/signals/check and /api/signals/check-instrument

## Task Commits

1. **Task 1: Auth bypass in terminal actions, IDOR in operation stats, middleware bypass narrowing** - `08f38d6` (fix)
2. **Task 2: Add optional userId filter to OperationRepository** - `76c8293` (fix)

## Files Created/Modified

- `src/server/actions/terminal-actions.ts` - Added getCurrentUserId() auth guard to getOrderBookAction and getTopMoversAction
- `src/server/actions/operation-actions.ts` - Added IDOR defense: load ownedIds via StrategyService, filter strategyIds to validIds
- `src/server/repositories/operation-repository.ts` - findByStrategyId and getStatsByStrategyId now accept optional userId with conditional .eq filter
- `src/lib/supabase/middleware.ts` - Narrowed isApiWebhook from startsWith("/api/signals") to exact path matches

## Decisions Made

- userId parameter in repository methods is optional to preserve backward compatibility with internal callers (signal checker, strategy checker) that already verified ownership upstream
- Middleware uses exact pathname === for cron paths — prevents hypothetical bypass via /api/signals/admin or similar future paths
- IDOR defense pattern: load owned entity set server-side, filter untrusted client IDs — never trust client-supplied IDs directly

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 security holes (SEC-01, SEC-04, SEC-06, SEC-07) are closed
- Repository ownership filter is ready to be used by future callers that pass userId through from server actions
- Ready for Plan 10-02 (rate limiting, input validation, or remaining security items)

---
*Phase: 10-security-code-quality-hardening*
*Completed: 2026-03-27*
