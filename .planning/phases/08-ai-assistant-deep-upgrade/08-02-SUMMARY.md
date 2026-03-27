---
phase: 08-ai-assistant-deep-upgrade
plan: "02"
subsystem: ai-provider
tags: [streaming, sse, deepseek-reasoner, thinking-mode, route-handler]
dependency_graph:
  requires: ["08-01"]
  provides: ["08-03", "08-04"]
  affects: [ai-provider, api-routes]
tech_stack:
  added: []
  patterns: [SSE streaming, async generator, model routing]
key_files:
  created:
    - src/app/api/ai/chat/route.ts
  modified:
    - src/server/providers/ai/deepseek-provider.ts
decisions:
  - "deepseek-reasoner used for analysis (streaming, no tools); deepseek-chat for strategy creation (blocking, tools)"
  - "reasoning_content stripped from apiMessages to prevent 400 error from DeepSeek API"
  - "chatWithThinking is additive — existing generateStrategy and chatAboutStrategy unchanged"
  - "needsToolCall checks last user message for Russian approval keywords"
  - "Route handler uses Supabase direct query instead of getCurrentUserId (no use server directive)"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_changed: 2
---

# Phase 08 Plan 02: DeepSeek Thinking Mode + SSE Streaming Summary

**One-liner:** DeepSeek provider extended with deepseek-reasoner streaming via async generator, SSE route at /api/ai/chat with auth and context enrichment.

## What Was Built

### Task 1: Extend DeepSeekProvider with chatWithThinking

Added `chatWithThinking(messages, forceCreate?)` async generator method to `DeepSeekProvider`:

- **Analysis path** (default): uses `deepseek-reasoner` with streaming, yields `{type: "thinking"}` chunks for `reasoning_content` and `{type: "content"}` chunks for response text
- **Strategy creation path**: triggered when `forceCreate=true` OR last user message contains approval keywords ("создай", "применить", "давай", "да, создай", "окей, создавай", "создавай") — uses `deepseek-chat` with `generateStrategyTool`, yields `{type: "strategy"}` with parsed JSON
- Both paths yield `{type: "done"}` to signal completion
- `needsToolCall(messages, forceCreate)` private method centralizes keyword detection
- `CHAT_SYSTEM_PROMPT` updated with thinking mode instructions (portfolio concentration warnings, market data analysis)
- History messages mapped to `{role, content}` only — `thinkingContent` and `reasoning_content` fields stripped

### Task 2: SSE Route Handler at /api/ai/chat

Created `src/app/api/ai/chat/route.ts` POST handler:

- Auth: `supabase.auth.getUser()` + `User` table lookup; returns 401 if unauthenticated
- Body: `{messages, context?: {ticker, timeframe, figi}, forceCreate?}`
- Context enrichment: if `context.ticker` provided, calls `AiContextService.assembleContext()` and prepends as context message
- Streams via `ReadableStream` wrapping `chatWithThinking` async generator
- Each chunk encoded as `data: ${JSON.stringify(chunk)}\n\n`
- Sends `data: [DONE]\n\n` on completion
- SSE headers: `text/event-stream`, `no-cache, no-transform`, `keep-alive`, `X-Accel-Buffering: no`
- Error handling at stream level and outer try/catch

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/server/providers/ai/deepseek-provider.ts` — exists and modified
- `src/app/api/ai/chat/route.ts` — exists and created
- Commit `cc721b0` — Task 1 (feat: extend DeepSeekProvider)
- Commit `6675e70` — Task 2 (feat: create SSE streaming route)
- TypeScript compiles without errors in modified files
