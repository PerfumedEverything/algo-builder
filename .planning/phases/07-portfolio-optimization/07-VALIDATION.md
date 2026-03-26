---
phase: 7
slug: portfolio-optimization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PORT-06 | unit | `npx vitest run src/server/services/__tests__/markowitz-optimizer.test.ts` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | PORT-07 | unit | `npx vitest run src/server/services/__tests__/markowitz-optimizer.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | PORT-06 | manual | Visual: side-by-side donut comparison | N/A | ⬜ pending |
| 07-02-02 | 02 | 2 | PORT-07 | manual | Visual: rebalancing action table | N/A | ⬜ pending |
| 07-02-03 | 02 | 2 | PORT-08 | manual | Visual: AI analysis streaming | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/server/services/__tests__/markowitz-optimizer.test.ts` — stubs for PORT-06, PORT-07
- [ ] Existing vitest infrastructure covers test runner needs

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side-by-side donut chart renders correctly | PORT-06 | Visual layout comparison | Open portfolio page → Analytics tab → see current vs optimal donuts |
| Rebalancing action list shows correct lot math | PORT-07 | Depends on live portfolio data | Check "Sell X lots" matches weight delta × portfolio value ÷ lot price |
| Full AI analysis streams all 4 dimensions | PORT-08 | Streaming AI output | Click "Full AI Portfolio Analysis" → verify risk, fundamentals, correlations, optimization sections appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
