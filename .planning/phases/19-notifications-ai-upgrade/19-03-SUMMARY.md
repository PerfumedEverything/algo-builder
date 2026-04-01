---
phase: 19-notifications-ai-upgrade
plan: "03"
subsystem: ai-chat
tags: [ai, grid-trading, deepseek, chat, tool-calls]
dependency_graph:
  requires: ["19-02"]
  provides: ["grid-strategy-via-chat", "broker-aware-chat-prompts", "grid-ai-context-injection"]
  affects: ["src/server/providers/ai/deepseek-provider.ts", "src/server/services/grid-ai-service.ts", "src/app/api/ai/chat/route.ts"]
tech_stack:
  added: []
  patterns: ["TDD-red-green", "broker-aware-prompts", "grid-ai-context-injection"]
key_files:
  created:
    - src/__tests__/ai-grid-chat.test.ts
  modified:
    - src/server/providers/ai/deepseek-provider.ts
    - src/server/services/grid-ai-service.ts
    - src/app/api/ai/chat/route.ts
decisions:
  - "generateGridStrategyTool passed alongside generateStrategyTool in tool call path — AI can select appropriate tool based on user intent"
  - "Grid config.type forced to GRID in tool call handler if missing — defensive guard"
  - "chatAboutStrategy uses getChatSystemPrompt(TINKOFF) instead of CHAT_SYSTEM_PROMPT — consistent with chatWithThinking"
  - "Grid context injection in route only when ticker + figi + grid keywords present — avoids unnecessary API calls"
metrics:
  duration_minutes: 6
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_changed: 4
---

# Phase 19 Plan 03: Grid Chat Integration Summary

Grid strategy creation via tool call and Grid AI suggestion injection wired into AI chat flow. DeepSeekProvider handles both create_strategy and create_grid_strategy tool calls with broker-aware prompts. GridAiService gains formatForChat for chat-friendly suggestion text.

## Tasks Completed

### Task 1: DeepSeekProvider Grid tool handling + broker-aware prompts

- Replaced `CHAT_SYSTEM_PROMPT` import with `getChatSystemPrompt` in both `chatAboutStrategy` and `chatWithThinking`
- Added `generateGridStrategyTool` import alongside `generateStrategyTool`
- Tool call path now passes both tools so AI can select based on intent
- Handler dispatches on tool name: `create_grid_strategy` → `{type: "grid_strategy"}`, `create_strategy` → `{type: "strategy"}`
- `needsToolCall` expanded with grid keywords: `запусти сетку`, `создай grid`, `создай грид`, `запусти grid`, `создай сетку`, variant selection keywords
- 5 TDD tests all pass

**Commits:**
- `f2f609d` — test(19-03): add failing tests for Grid chat integration
- `808fb82` — feat(19-03): wire Grid tool + broker-aware prompts in DeepSeekProvider

### Task 2: GridAiService.formatForChat + chat route grid detection

- Added `static formatForChat(suggestion: GridSuggestion, instrument: string): string` to `GridAiService`
- Returns human-readable block with range, levels, step, distribution, fee, expected profit, estimated monthly trades, reasoning
- Chat route detects grid keywords in last user message (`grid`, `грид`, `сетка`, `сеточн`)
- When grid keywords + `context.ticker` + `context.figi` present, calls `GridAiService.suggestParams` and prepends `[Grid Trading анализ]` context block to enriched messages
- Failure is caught and logged, does not break the request

**Commit:**
- `0840d9d` — feat(19-03): GridAiService.formatForChat + grid context injection in chat route

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data paths are wired.

## Self-Check: PASSED
