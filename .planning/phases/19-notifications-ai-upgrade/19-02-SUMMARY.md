---
phase: 19-notifications-ai-upgrade
plan: 02
subsystem: ai
tags: [ai, deepseek, grid-trading, broker-aware, prompts, chat]

# Dependency graph
requires:
  - phase: 15-grid-trading
    provides: GridConfig type and grid trading domain knowledge
  - phase: 14-bybit-provider-backend
    provides: BrokerRepository.getBrokerType, BYBIT/TINKOFF distinction
provides:
  - CHAT_SYSTEM_PROMPT with Grid Trading section (parameters, when to use, 2-3 variant rule)
  - getChatSystemPrompt(brokerType) broker-aware prompt selector
  - generateGridStrategyTool with full GridConfig schema
  - Broker-aware chat endpoint that fetches brokerType from DB
affects: [ai-chat, deepseek-provider, grid-trading-creation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getChatSystemPrompt(brokerType) selector pattern for broker-context injection
    - brokerType threaded from route through provider to system prompt

key-files:
  created: []
  modified:
    - src/server/providers/ai/ai-prompts.ts
    - src/server/providers/ai/ai-crypto-prompts.ts
    - src/server/providers/ai/ai-tools.ts
    - src/server/providers/ai/types.ts
    - src/server/providers/ai/deepseek-provider.ts
    - src/app/api/ai/chat/route.ts

key-decisions:
  - "getChatSystemPrompt(brokerType) appends broker context suffix to base CHAT_SYSTEM_PROMPT — avoids duplication"
  - "brokerType fetched at route level (not provider level) — route owns auth context"
  - "AiStreamChunk.type extended with grid_strategy and error — allows client to differentiate grid strategy responses"

patterns-established:
  - "Broker context injection: getChatSystemPrompt returns different context for BYBIT vs TINKOFF"
  - "Grid strategy tool: generateGridStrategyTool follows same shape as generateStrategyTool"

requirements-completed: [AI-01, AI-02, AI-04, AI-05]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 19 Plan 02: AI Grid Trading Knowledge + Broker-Aware Chat Summary

**Grid Trading knowledge added to AI prompts, broker-aware getChatSystemPrompt selector created, create_grid_strategy tool defined with full GridConfig schema, and chat endpoint now fetches brokerType from DB to contextualize AI advice**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-01T09:00:00Z
- **Completed:** 2026-04-01T09:08:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- CHAT_SYSTEM_PROMPT now includes a complete Grid Trading section: parameters, when to use/avoid, and mandatory 2-3 variant proposal before create_grid_strategy call
- getChatSystemPrompt(brokerType) exports a broker-aware selector that appends BYBIT or T-Invest context to the base prompt
- generateGridStrategyTool defined with full GridConfig schema (lowerPrice, upperPrice, gridLevels, amountPerOrder, gridDistribution, stopLoss, takeProfit, feeRate)
- Chat route fetches brokerType from DB via BrokerRepository and passes it through to DeepSeekProvider.chatWithThinking
- AiStreamChunk.type updated to include grid_strategy and error variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Grid Trading knowledge in AI prompts + broker-aware chat system prompt** - `0c354f1` (feat)
2. **Task 2: create_grid_strategy tool definition + broker-aware chat endpoint** - `5454f8a` (feat)

## Files Created/Modified
- `src/server/providers/ai/ai-prompts.ts` - Added Grid Trading section to CHAT_SYSTEM_PROMPT, exported getChatSystemPrompt(brokerType)
- `src/server/providers/ai/ai-crypto-prompts.ts` - Appended Grid Trading knowledge for crypto market context
- `src/server/providers/ai/ai-tools.ts` - Added generateGridStrategyTool with full GridConfig JSON schema
- `src/server/providers/ai/types.ts` - Extended AiStreamChunk.type with grid_strategy/error; chatWithThinking accepts brokerType
- `src/server/providers/ai/deepseek-provider.ts` - chatWithThinking uses getChatSystemPrompt(brokerType) instead of CHAT_SYSTEM_PROMPT
- `src/app/api/ai/chat/route.ts` - Fetches brokerType from BrokerRepository, passes to chatWithThinking

## Decisions Made
- getChatSystemPrompt(brokerType) appends broker context as a suffix to CHAT_SYSTEM_PROMPT rather than duplicating the full prompt — keeps maintenance simple
- brokerType fetched at the route level (not inside the provider) because the route owns the auth/DB context
- AiStreamChunk.type extended with grid_strategy and error variants for future client-side differentiation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated deepseek-provider.ts to use getChatSystemPrompt**
- **Found during:** Task 2 (broker-aware chat endpoint)
- **Issue:** Plan specified adding getChatSystemPrompt to ai-prompts.ts and passing brokerType through the route, but did not explicitly update deepseek-provider.ts to call the new selector. Without this, the route would pass brokerType but the provider would still use the constant CHAT_SYSTEM_PROMPT, making broker-awareness a no-op.
- **Fix:** Updated chatWithThinking in deepseek-provider.ts to call getChatSystemPrompt(brokerType) and imported the new function
- **Files modified:** src/server/providers/ai/deepseek-provider.ts
- **Verification:** grep confirms getChatSystemPrompt usage in provider
- **Committed in:** 5454f8a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical functionality)
**Impact on plan:** Fix was required for broker-awareness to actually work end-to-end. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in unrelated test files (broker-service.test.ts, fifo-calculator.test.ts, operation-service.test.ts) — out of scope, not fixed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AI chat is now broker-aware (BYBIT vs TINKOFF context injected per user)
- Grid Trading tool is defined and ready for provider-level integration in Plan 03
- AiStreamChunk supports grid_strategy type for client-side parsing

---
*Phase: 19-notifications-ai-upgrade*
*Completed: 2026-04-01*
