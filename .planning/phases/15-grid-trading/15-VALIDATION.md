---
phase: 15
slug: grid-trading
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | GRID-01 | unit | `npx vitest run src/__tests__/grid/grid-engine.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | GRID-02,03 | unit | `npx vitest run src/__tests__/grid/grid-engine.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | GRID-05 | unit | `npx vitest run src/__tests__/grid/grid-simulation.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | GRID-06 | unit | `npx vitest run src/__tests__/grid/grid-service.test.ts` | ❌ W0 | ⬜ pending |
| 15-04-01 | 04 | 2 | GRID-07,08 | build | `npx next build 2>&1 | tail -5` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/grid/grid-engine.test.ts` — grid level calculation + P&L tests
- [ ] `src/__tests__/grid/grid-simulation.test.ts` — 100+ tick simulation tests
- [ ] `src/__tests__/grid/grid-service.test.ts` — service layer unit tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Grid levels visualized on chart | GRID-07 | Requires visual inspection | Create grid, verify price lines on chart |
| AI suggests grid parameters | GRID-10 | Requires DeepSeek API call | Click AI suggest button, verify params are reasonable |
| Stop button cancels all orders | GRID-09 | Requires active grid | Start grid, click stop, verify all pending cancelled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
