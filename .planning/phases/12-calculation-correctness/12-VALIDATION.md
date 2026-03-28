---
phase: 12
slug: calculation-correctness
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-28
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Phase-scoped suite must be green (see Phase Gate below)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | CALC-01, CALC-02, CALC-03 | unit | `npx vitest run src/__tests__/risk-calculations.test.ts` | ✅ (extend) | ⬜ pending |
| 12-02-01 | 02 | 1 | CALC-04, CALC-05, CALC-06 | unit | `npx vitest run src/__tests__/candle-validator.test.ts` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | CALC-07, CALC-08, CALC-09 | unit | `npx vitest run src/__tests__/fifo-calculator.test.ts` | ✅ partial | ⬜ pending |
| 12-03-01 | 03 | 2 | CALC-10, CALC-11, CALC-12, CALC-13 | unit+integration | `npx vitest run src/__tests__/evaluate-conditions.test.ts src/__tests__/backtest-service.test.ts` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 1 | CALC-14, CALC-15, CALC-16, CALC-17 | unit+integration | `npx vitest run src/__tests__/portfolio-amounts.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify vitest config supports new test files in `__tests__/` directories

**Pre-existing failing tests (OUT OF SCOPE):**

3 pre-existing failing tests exist outside this phase's domain: `operation-actions.test.ts`, `moex-provider.test.ts`, `daily-session-stats.test.ts`. These are NOT caused by Phase 12 changes and are NOT addressed by this phase. The phase gate below is scoped to phase-specific test files only.

*Existing vitest infrastructure covers framework needs. Wave 0 creates new test files as part of plan tasks.*

---

## Phase Gate

The phase gate is scoped to **phase-specific test files only** (not the full suite). This avoids blocking Phase 12 on pre-existing failures unrelated to calculation correctness.

**Phase gate command:**
```bash
npx vitest run src/__tests__/risk-calculations.test.ts src/__tests__/candle-validator.test.ts src/__tests__/fifo-calculator.test.ts src/__tests__/evaluate-conditions.test.ts src/__tests__/backtest-service.test.ts src/__tests__/portfolio-amounts.test.ts --reporter=verbose
```

All 6 test files must exit 0 before `/gsd:verify-work`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Portfolio UI shows real amounts | CALC-14, CALC-15 | Visual check on real data | Open portfolio with active strategies, compare displayed amounts with DB operations |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Phase gate scoped to phase-specific tests (pre-existing failures documented as out of scope)

**Approval:** ready
