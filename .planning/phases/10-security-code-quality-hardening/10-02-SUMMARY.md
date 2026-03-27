---
phase: 10-security-code-quality-hardening
plan: "02"
subsystem: api-security
tags: [rate-limiting, input-validation, prompt-injection, redis, sse]
dependency_graph:
  requires: []
  provides: [rate-limit-utility, hardened-chat-endpoint, connection-limited-stream]
  affects: [src/app/api/ai/chat/route.ts, src/app/api/prices/stream/route.ts, src/server/providers/ai/deepseek-provider.ts]
tech_stack:
  added: []
  patterns: [redis-rate-limiting, connection-tracking, defense-in-depth-filtering]
key_files:
  created:
    - src/lib/rate-limit.ts
  modified:
    - src/app/api/ai/chat/route.ts
    - src/app/api/prices/stream/route.ts
    - src/server/providers/ai/deepseek-provider.ts
decisions:
  - "checkRateLimit uses redis.incr + expire(key, window) on first increment for atomic sliding window"
  - "trackConnection uses TTL 300s as safety net for connections that never release"
  - "releaseConnection floors at 0 using get-check before decr to prevent negative counters"
  - "safeMessages filter applied in both route (primary) and provider (defense-in-depth) for SEC-05"
metrics:
  duration: 2 min
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 4
---

# Phase 10 Plan 02: API Rate Limiting, Input Validation, and Prompt Injection Prevention Summary

Redis-based rate limiting (10/min AI chat, 3 concurrent SSE streams), 413 input size validation (50 messages / 50k chars), and dual-layer role filtering preventing system prompt injection via client messages.

## What Was Built

### Task 1: Rate-limit utility + hardened chat endpoint

Created `src/lib/rate-limit.ts` with three exports:
- `checkRateLimit(userId, action, maxRequests, windowSeconds)` — Redis INCR + EXPIRE sliding window
- `trackConnection(userId, action, maxConcurrent)` — concurrent connection counter with TTL safety net and release callback
- `releaseConnection(userId, action)` — explicit decrement with floor-at-zero guard

Hardened `src/app/api/ai/chat/route.ts` (SEC-02, SEC-03, SEC-05):
- Rate limit: 10 requests/60s per user — returns 429 on exceeded
- Input: rejects empty/non-array messages (400), >50 messages (413), >50k total chars (413)
- Role filter: strips any message with role other than "user" or "assistant" before enrichment and provider call

### Task 2: Connection-limited price stream + provider-side role filter

Updated `src/app/api/prices/stream/route.ts`:
- Captures userId from `getCurrentUserId()` instead of discarding it
- `trackConnection(userId, "price-stream", 3)` limits to 3 concurrent SSE connections per user
- `release()` called on both `request.signal` abort and stream `cancel()` to correctly decrement counter

Updated `src/server/providers/ai/deepseek-provider.ts` (SEC-05 defense-in-depth):
- `chatWithThinking` filters incoming messages to user/assistant only via `safeMessages`
- Provider's own `CHAT_SYSTEM_PROMPT` is prepended separately and is NOT filtered

## Decisions Made

- Redis INCR pattern chosen over SET/GET for atomic increment without race conditions
- TTL 300s on connection counter as dead-man switch — prevents leaked connections if client disconnects without abort signal
- releaseConnection has an explicit get-before-decr guard to prevent Redis counter going negative
- Role filter applied at route level (primary) and provider level (secondary) for defense-in-depth per SEC-05

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/lib/rate-limit.ts: FOUND
- src/app/api/ai/chat/route.ts: FOUND with checkRateLimit, 413, safeMessages
- src/app/api/prices/stream/route.ts: FOUND with trackConnection, release
- src/server/providers/ai/deepseek-provider.ts: FOUND with safeMessages
- Commits: 46df145 (task 1), 74319da (task 2)
