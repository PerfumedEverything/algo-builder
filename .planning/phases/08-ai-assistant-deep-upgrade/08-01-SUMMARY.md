---
phase: 08-ai-assistant-deep-upgrade
plan: "01"
subsystem: ai-context
tags: [ai, context-assembly, types, tdd, streaming]
dependency_graph:
  requires: []
  provides: [AiContextService, AiStreamChunk, QuickAction, AiContextParams, SENIOR_TIMEFRAME]
  affects: [src/server/providers/ai/types.ts, src/server/services/ai-context-service.ts, src/server/services/index.ts]
tech_stack:
  added: []
  patterns: [Promise.allSettled for parallel fetch with partial failure isolation, static class method for context assembly]
key_files:
  created:
    - src/server/services/ai-context-service.ts
    - src/__tests__/ai-context-service.test.ts
  modified:
    - src/server/providers/ai/types.ts
    - src/server/services/index.ts
decisions:
  - AiContextService uses static method assembleContext to avoid instantiation overhead across future plans
  - SENIOR_TIMEFRAME map is exported as named constant for reuse in downstream plans
  - Context truncated to 50k chars by slicing assembled string (not per-section) for simplicity
  - chatWithThinking is optional on AiProvider interface to maintain backward compatibility with DeepSeekProvider
metrics:
  duration_minutes: 3
  completed_date: "2026-03-27"
  tasks_completed: 1
  files_modified: 4
---

# Phase 08 Plan 01: AI Foundation Types and Context Assembly Summary

AiContextService assembles multi-source market context (OHLCV candles, senior timeframe, portfolio, fundamentals) into structured prompt text ≤50k chars using Promise.allSettled for fault isolation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing tests for AiContextService | 42aa08b | src/__tests__/ai-context-service.test.ts |
| GREEN | Implement AiContextService + extended types | 4ee9830 | types.ts, ai-context-service.ts, index.ts, test.ts |

## What Was Built

### Extended AI Types (`src/server/providers/ai/types.ts`)
- `AiStreamChunk`: typed union for streaming responses (`thinking | content | strategy | done`)
- `QuickAction`: for quick-reply buttons in chat UI (`CREATE | MORE | ADJUST_RISKS`)
- `AiContextParams`: params for context assembly (`ticker, timeframe, userId, figi?`)
- Extended `AiChatMessage` and `AiChatResponse` with optional `thinkingContent` field
- Added optional `chatWithThinking` to `AiProvider` interface (backward compatible)

### AiContextService (`src/server/services/ai-context-service.ts`)
- `SENIOR_TIMEFRAME` map: `1m→5m, 5m→15m, 15m→1h, 1h→4h, 4h→1d, 1d→1w, 1w→1w`
- `AiContextService.assembleContext(params)`: fetches candles, senior TF candles, portfolio, fundamentals in parallel via `Promise.allSettled`
- Primary candles: last 100 bars max. Senior candles: last 50 bars max.
- Sections formatted in Russian with headers recognizable by AI prompts
- Total context truncated to 50k chars if exceeded
- Each section omitted if its data fetch failed (partial failure tolerance)

## Unit Tests (9/9 pass)

1. OHLCV section present when candles available
2. Portfolio section with tickers and weights when portfolio available
3. Senior timeframe section when senior candles available
4. Fundamentals (P/E, dividends) when hasFundamentals=true
5. Primary candle section truncated to ≤100 bars
6. Total context ≤50000 chars
7. SENIOR_TIMEFRAME map correctness for all 7 timeframes
8. Partial failure isolation — portfolio down still returns candles + fundamentals
9. Works with figi param (order book intent)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 5 assertion counted lines across all sections**
- **Found during:** GREEN phase test run
- **Issue:** Test counted date-pattern lines from both primary AND senior TF sections (total 150 lines with 150 input candles), causing false failure
- **Fix:** Narrowed assertion to extract only the primary section block via regex before counting lines
- **Files modified:** `src/__tests__/ai-context-service.test.ts`

**2. [Rule 1 - Bug] vi.mock with arrow function not treated as constructor**
- **Found during:** First GREEN test run
- **Issue:** `vi.fn().mockImplementation(() => instance)` produces non-constructor mock, failing `new BrokerService()` in service
- **Fix:** Changed vi.mock factory to use `function BrokerService() {}` with prototype methods pointing to named `vi.fn()` constants
- **Files modified:** `src/__tests__/ai-context-service.test.ts`

### Out of Scope

- Order book section (Test 9 in plan) — `getOrderBookAction` requires a server action context with auth. Plan says "figi param, depth=5". Implemented test as smoke test (returns non-empty string) but did NOT wire actual order book into assembleContext since it requires `TinkoffInvestApi` system token. Deferred to plan 08-02 when streaming provider is wired.

## Self-Check: PASSED

All files found:
- src/server/providers/ai/types.ts — FOUND
- src/server/services/ai-context-service.ts — FOUND
- src/__tests__/ai-context-service.test.ts — FOUND

All commits found:
- 42aa08b (RED tests) — FOUND
- 4ee9830 (GREEN implementation) — FOUND
