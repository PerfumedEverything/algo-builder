---
phase: 10-security-code-quality-hardening
plan: "03"
subsystem: security
tags: [file-upload, security, docker, redis, mime-type]
dependency_graph:
  requires: []
  provides: [SEC-08, SEC-10]
  affects: [admin-actions, docker-compose]
tech_stack:
  added: []
  patterns: [MIME-to-extension map, Redis auth]
key_files:
  created: []
  modified:
    - src/server/actions/admin-actions.ts
    - docker-compose.yml
decisions:
  - MIME_TO_EXT map added near top of admin-actions.ts — derives extension from validated file.type, not user-supplied filename
  - Redis command arg receives REDIS_PASSWORD via Docker Compose variable substitution from host .env — no env_file needed in redis service
metrics:
  duration_seconds: 51
  completed_date: "2026-03-27T11:02:07Z"
  tasks_completed: 1
  files_modified: 2
---

# Phase 10 Plan 03: Upload MIME Extension Fix + Redis Hardening Summary

**One-liner:** MIME-based extension lookup (MIME_TO_EXT map) replaces filename-split to prevent spoofing; Redis hardened with requirepass, 256mb maxmemory, allkeys-lru eviction.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix upload MIME + harden Docker Redis | 8031f62 | admin-actions.ts, docker-compose.yml |

## Changes Made

### SEC-08: MIME-based extension in admin-actions.ts

- Added `MIME_TO_EXT` constant map after imports mapping `image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`
- Replaced `file.name.split(".").pop() ?? "png"` with `MIME_TO_EXT[file.type] ?? "png"` on line 152
- Extension is now derived from the already-validated MIME type (`file.type`), not the user-controlled filename

### SEC-10: Docker Redis hardening in docker-compose.yml

- Added `command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru`
- Added comment above redis service: `# REDIS_URL must include password: redis://:${REDIS_PASSWORD}@redis:6379`
- `${REDIS_PASSWORD}` interpolated by Docker Compose from host `.env` at compose-up time (no env_file on redis service needed)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `grep MIME_TO_EXT src/server/actions/admin-actions.ts` → 2 matches (definition + usage)
- `grep "file\.name\.split" src/server/actions/admin-actions.ts` → 0 matches (old pattern removed)
- `grep requirepass docker-compose.yml` → 1 match
- `grep "maxmemory 256mb" docker-compose.yml` → 1 match
- Commit 8031f62 verified in git log
