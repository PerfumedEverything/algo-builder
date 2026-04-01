---
phase: 18-production-polish
plan: "02"
subsystem: infrastructure
tags: [docker, healthcheck, env, logging, production]
dependency_graph:
  requires: []
  provides: [docker-healthchecks, env-documentation, clean-production-logs]
  affects: [docker-compose.yml, Dockerfile, Dockerfile.worker, Dockerfile.bot, Dockerfile.bybit-worker, Dockerfile.smoke, .env.example]
tech_stack:
  added: []
  patterns: [docker-healthcheck, redis-heartbeat, env-documentation]
key_files:
  created: []
  modified:
    - Dockerfile
    - Dockerfile.worker
    - Dockerfile.bot
    - Dockerfile.bybit-worker
    - Dockerfile.smoke
    - docker-compose.yml
    - .env.example
    - src/server/providers/notification/mock-notification-provider.ts
decisions:
  - "Worker healthchecks use ioredis heartbeat key pattern — no HTTP endpoint available in worker processes"
  - "Telegram bot and smoke runner use basic process.exit(0) check — no addressable endpoint"
  - "Redis healthcheck uses redis-cli ping with password — required since Redis uses requirepass"
  - "service_healthy condition for all redis-dependent services — ensures Redis ready before workers connect"
  - "console.log removed from mock-notification-provider — mock pattern itself is sufficient, no production value in log"
metrics:
  duration_seconds: 126
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 8
---

# Phase 18 Plan 02: Docker Healthchecks + Env Docs + Console Cleanup Summary

**One-liner:** Docker healthchecks for all 5 containers via Redis heartbeat and HTTP probe, complete .env.example with 20+ documented vars, zero console.log in production src/.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Docker healthchecks for all services | 0d25d9f | Done |
| 2 | Complete .env.example + console.log cleanup | 27ddc66 | Done |

## What Was Built

### Task 1: Docker healthchecks

- **Dockerfile (Next.js):** `wget` probe to `/api/health` every 30s — uses wget available in alpine
- **Dockerfile.worker:** ioredis `worker:heartbeat` key age check — exits 1 if key missing or older than 120s
- **Dockerfile.bybit-worker:** ioredis `bybit-worker:heartbeat` key age check — same pattern as price worker
- **Dockerfile.bot:** basic `node -e "process.exit(0)"` every 60s — Telegram bot has no HTTP endpoint
- **Dockerfile.smoke:** basic process check every 300s — matches smoke runner's 5-minute cycle
- **docker-compose.yml:** Redis healthcheck with `redis-cli -a ${REDIS_PASSWORD} ping`; all redis-dependent services (`nextjs`, `price-worker`, `bybit-worker`, `smoke-runner`) use `condition: service_healthy`

### Task 2: Env docs + cleanup

- **.env.example:** Rewritten from 31 lines to 79 lines with all vars grouped in 7 sections: Supabase, Database, Redis, AI Provider, T-Invest, Bybit, Telegram, Cron/Internal API, App
- New vars added: `REDIS_PASSWORD`, `BYBIT_TESTNET`, `TELEGRAM_ADMIN_CHAT_ID`, `SMOKE_CHAT_ID`, `MAX_BOT_TOKEN`, `CRON_SECRET`
- Every variable has a comment description on the preceding line
- **mock-notification-provider.ts:** Removed `console.log` — only console.log in src/ — unused in production; `chatId` and `message` params renamed to `_chatId` and `_message` to silence TypeScript unused-parameter warnings

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- Dockerfile HEALTHCHECK: present (verified grep)
- Dockerfile.worker HEALTHCHECK: present
- Dockerfile.bot HEALTHCHECK: present
- Dockerfile.bybit-worker HEALTHCHECK: present
- Dockerfile.smoke HEALTHCHECK: present
- docker-compose.yml healthcheck + service_healthy: 4 occurrences
- .env.example BYBIT_TESTNET, CRON_SECRET, REDIS_PASSWORD, TELEGRAM_ADMIN_CHAT_ID, SMOKE_CHAT_ID: all present
- console.log in src/: 0 occurrences
- Commits 0d25d9f and 27ddc66: verified in git log
