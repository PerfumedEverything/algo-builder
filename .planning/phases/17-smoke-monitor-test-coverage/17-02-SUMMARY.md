---
phase: 17-smoke-monitor-test-coverage
plan: "02"
subsystem: smoke-monitor
tags: [smoke, monitoring, docker, testing, workers, redis]
dependency_graph:
  requires: []
  provides: [smoke-monitor, worker-heartbeats, health-endpoint, smoke-docker-infra]
  affects: [price-stream-worker, bybit-stream-worker, docker-compose]
tech_stack:
  added: [grammy (bot.api.sendMessage), ioredis (probe), @supabase/supabase-js (probe)]
  patterns: [probe-function-pattern, promise-allsettled-with-timeout]
key_files:
  created:
    - scripts/smoke-probes.ts
    - scripts/smoke-monitor.ts
    - Dockerfile.smoke
    - src/app/api/health/route.ts
    - src/__tests__/smoke/smoke-monitor.test.ts
  modified:
    - scripts/price-stream-worker.ts
    - scripts/bybit-stream-worker.ts
    - docker-compose.yml
decisions:
  - "smoke-probes.ts split from smoke-monitor.ts to respect 150-line limit; all 10 probe functions exported for independent unit testing"
  - "probeBybitWorker returns ok:true with reason 'not enabled' on null key — not all deploys have Bybit"
  - "probeActiveStrategies (SMOKE-04): count=0 returns ok:false — proves data layer + active trading config is working"
  - "probeTelegramBot returns ok:true on missing key — no heartbeat write in bot yet, treat as non-critical"
  - "smoke-monitor uses Promise.allSettled with 10s per-probe timeout — one stuck probe cannot block all others"
  - "worker:heartbeat written inside existing healthCheck() interval (30s) — reuses existing timer, no new setInterval"
metrics:
  duration: "~5 min"
  completed: "2026-03-31T13:10:16Z"
  tasks: 2
  files: 8
---

# Phase 17 Plan 02: Smoke Monitor + Worker Heartbeats Summary

Smoke monitor with 10 production probes, worker heartbeats every 30s, /api/health endpoint, Dockerfile.smoke with 5-minute loop, docker-compose smoke-runner service, and 22 unit tests covering all probe happy/failure paths.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add worker heartbeat writes + /api/health endpoint | 9c03105 | price-stream-worker.ts, bybit-stream-worker.ts, src/app/api/health/route.ts |
| 2 | Create smoke monitor script + Docker infra + unit tests | 9bff054 | smoke-probes.ts, smoke-monitor.ts, Dockerfile.smoke, docker-compose.yml, smoke-monitor.test.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

- 22 tests passing in src/__tests__/smoke/smoke-monitor.test.ts
- All 10 probe functions covered (health, redis, database, price-worker, bybit-worker, telegram-bot, signals-check, prices-endpoint, candle-cache, active-strategies)
- SMOKE-04 (probeActiveStrategies) tested with ok:true / ok:false / error paths

## Known Stubs

None — all probes wire to real dependencies (Redis, Supabase, fetch). Smoke runs against live services at runtime.

## Self-Check: PASSED

All 5 created files exist. Both task commits (9c03105, 9bff054) confirmed in git log. 22 unit tests passing.
