---
phase: 14-bybit-provider-backend
plan: "05"
subsystem: bybit-worker
tags: [bybit, websocket, redis, streaming, docker]
dependency_graph:
  requires: [14-04]
  provides: [bybit-stream-worker, bybit-docker-service]
  affects: [docker-compose, redis-price-keys]
tech_stack:
  added: [Dockerfile.bybit-worker]
  patterns: [WebsocketClient, pub/sub, Redis TTL]
key_files:
  created:
    - scripts/bybit-stream-worker.ts
    - Dockerfile.bybit-worker
  modified:
    - docker-compose.yml
    - .env.example
decisions:
  - bybit-worker uses dedicated Dockerfile.bybit-worker (not main Dockerfile) — matches price-worker pattern, avoids heavy Next.js build
  - exception event used instead of deprecated error event (bybit-api types UseTheExceptionEventInstead=never)
  - kline confirm field treated as truthy (boolean in bybit-api runtime data)
metrics:
  duration: "3 min"
  completed: "2026-03-28T13:06:41Z"
  tasks: 2
  files: 4
---

# Phase 14 Plan 05: Bybit WebSocket Streaming Worker Summary

**One-liner:** Bybit WebSocket worker streaming tickers/orderbook/klines to Redis using bybit-api WebsocketClient with testnet mode and auto-reconnect.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create bybit-stream-worker.ts | a2b2bfb | scripts/bybit-stream-worker.ts |
| 2 | Add bybit-worker to Docker Compose | 95bcc8f | docker-compose.yml, Dockerfile.bybit-worker, .env.example |

## What Was Built

### scripts/bybit-stream-worker.ts (105 lines)
- Connects to Bybit testnet via `WebsocketClient` from bybit-api
- Subscribes to `tickers.{symbol}`, `orderbook.1.{symbol}`, `kline.1.{symbol}` for all 8 pairs in `BYBIT_CRYPTO_PAIRS`
- Writes to Redis keys: `price:{symbol}` (TTL 120s), `orderbook:{symbol}` (TTL 120s), `candles:{symbol}:{interval}` (ring buffer, 1000 entries)
- Publishes to `price-updates` pub/sub channel: `{ instrumentId, price, timestamp }` — same format as T-Invest worker
- Graceful shutdown on SIGTERM/SIGINT
- Exits on missing `BYBIT_API_KEY` / `BYBIT_API_SECRET`

### Dockerfile.bybit-worker
- Mirrors `Dockerfile.worker` pattern (node:20-alpine, npm ci --omit=dev, tsx)
- Copies only required files: bybit-stream-worker.ts + bybit-constants.ts

### docker-compose.yml changes
- Added `bybit-worker` service with `Dockerfile.bybit-worker`, env vars for API credentials, redis dependency, restart policy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Use `exception` event instead of deprecated `error` event**
- **Found during:** Task 1 TypeScript check
- **Issue:** bybit-api types `error` event as `UseTheExceptionEventInstead = never` — passing any listener triggers TS2345
- **Fix:** Changed `wsClient.on("error", ...)` to `wsClient.on("exception", ...)`
- **Files modified:** scripts/bybit-stream-worker.ts
- **Commit:** a2b2bfb

**2. [Rule 3 - Blocking] Create dedicated Dockerfile.bybit-worker**
- **Found during:** Task 2 — plan said `dockerfile: Dockerfile` but that's the heavy Next.js Dockerfile with build args
- **Fix:** Created `Dockerfile.bybit-worker` mirroring the `Dockerfile.worker` pattern used by price-worker
- **Files modified:** docker-compose.yml, Dockerfile.bybit-worker (new)
- **Commit:** 95bcc8f

## Self-Check: PASSED

- FOUND: scripts/bybit-stream-worker.ts
- FOUND: Dockerfile.bybit-worker
- FOUND: commit a2b2bfb
- FOUND: commit 95bcc8f
