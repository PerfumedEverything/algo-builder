---
phase: 4
slug: ai-revolution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | AIREV-05 | unit | `npm run test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | AIREV-05 | unit | `npm run test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | AIREV-05 | unit | `npm run test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | AIREV-05 | unit | `npm run test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | AIREV-06 | unit | `npm run test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | AIREV-06 | unit | `npm run test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | AIREV-01 | manual | — | — | ⬜ pending |
| 04-03-02 | 03 | 2 | AIREV-02 | manual | — | — | ⬜ pending |
| 04-04-01 | 04 | 2 | AIREV-03 | manual | — | — | ⬜ pending |
| 04-04-02 | 04 | 2 | AIREV-04 | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/indicator-calculator-new.test.ts` — stubs for AIREV-05 (ATR, Stochastic, VWAP, WilliamsR)
- [ ] `src/__tests__/crossing-detector-between.test.ts` — stubs for AIREV-06 (BETWEEN condition logic)

*Existing test infrastructure (Vitest) is already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Free-form AI chat creates strategy | AIREV-01 | Requires DeepSeek API + live dialog state | Open strategy dialog, describe trading idea in free text, verify AI proposes complete config |
| Live strategy preview updates during chat | AIREV-02 | Requires real AI responses + UI rendering | Watch preview panel update as AI extracts params from conversation |
| Terminal analysis seeds strategy dialog | AIREV-03 | Requires terminal chart + AI analysis result | Run AI analysis on chart, click "Create Strategy", verify chat pre-filled |
| Terminal analysis seeds signal dialog | AIREV-04 | Requires terminal chart + AI analysis result | Run AI analysis on chart, click "Create Signal", verify AI suggests conditions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
