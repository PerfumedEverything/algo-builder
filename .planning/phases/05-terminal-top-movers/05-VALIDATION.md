---
phase: 05
slug: terminal-top-movers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts present) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/__tests__/terminal/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/terminal/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | isMarketOpen | unit | `npx vitest run src/__tests__/lib/market-hours.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | TERM-01 | unit | `npx vitest run src/__tests__/terminal/top-movers-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | TERM-02 | unit | `npx vitest run src/__tests__/terminal/top-movers-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | TERM-03 | unit | `npx vitest run src/__tests__/terminal/top-movers-panel.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/terminal/top-movers-panel.test.tsx` — stubs for TERM-01, TERM-02, TERM-03
- [ ] `src/__tests__/lib/market-hours.test.ts` — stubs for isMarketOpen MSK timezone logic

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual layout matches two-column grid | D-02 | CSS layout verification | Open /terminal, verify gainers left / losers right on desktop |
| Mobile stacks vertically | Claude's Discretion | Responsive CSS | Open /terminal on mobile viewport, verify single column |
| "Биржа закрыта" badge shows outside hours | SC-4 | Requires real time check | Visit /terminal outside 09:50-18:50 MSK, verify badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
