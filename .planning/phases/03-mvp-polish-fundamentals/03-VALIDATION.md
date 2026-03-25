---
phase: 3
slug: mvp-polish-fundamentals
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | POL-07 | unit | `npx vitest run src/__tests__/operation-service.test.ts -x` | Partial | ⬜ pending |
| 03-01-02 | 01 | 1 | POL-08 | manual | Visual inspection | N/A | ⬜ pending |
| 03-02-01 | 02 | 1 | POL-03 | unit | `npx vitest run src/__tests__/signal-service.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | POL-04 | manual | Sidebar inspection | N/A | ⬜ pending |
| 03-02-03 | 02 | 1 | POL-05, POL-06 | manual | Terminal visual check | N/A | ⬜ pending |
| 03-02-04 | 02 | 1 | POL-09 | manual | Terminal → create flow | N/A | ⬜ pending |
| 03-03-01 | 03 | 2 | POL-10 | manual | AI chat create flow | N/A | ⬜ pending |
| 03-03-02 | 03 | 2 | POL-01 | manual | Portfolio summary block | N/A | ⬜ pending |
| 03-03-03 | 03 | 2 | POL-02 | manual | AI button color check | N/A | ⬜ pending |
| 03-04-01 | 04 | 3 | INFR-02b | unit | `npx vitest run src/__tests__/fundamental-service.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 3 | FUND-01 | unit | `npx vitest run src/__tests__/fundamental-service.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 3 | FUND-02 | unit | `npx vitest run src/__tests__/fundamental-service.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 3 | FUND-03, FUND-04 | manual | Portfolio position expand | N/A | ⬜ pending |
| 03-05-02 | 05 | 3 | FUND-05 | manual | AI fundamental analysis | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/fundamental-service.test.ts` — stubs for FUND-01, FUND-02 score logic
- [ ] `src/__tests__/signal-service.test.ts` — stubs for POL-03 cleanTicker at save
- [ ] Verify `src/__tests__/operation-service.test.ts` covers closed position `currentAmount=0` case

*Existing infrastructure (Vitest) covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Strategy card shows P&L only when closed | POL-07 (display) | Visual UI | Create strategy, trigger buy+sell, verify card shows only P&L |
| Tooltips on strategy conditions | POL-08 | Visual UI | Hover over condition text, verify tooltip appears |
| Terminal sidebar position | POL-04 | Visual UI | Check sidebar nav order |
| Chart timeframes correct data | POL-05 | Visual UI | Select 1D, verify daily candles over weeks |
| Terminal mobile layout | POL-06 | Visual UI | Resize to 390px, verify layout |
| Terminal create buttons | POL-09 | Visual UI | Select instrument, verify buttons appear |
| AI chat as default create | POL-10 | Visual UI | Open strategy dialog, verify AI chat is default |
| Portfolio summary block | POL-01 | Visual UI | Check portfolio page summary cards |
| AI buttons blue | POL-02 | Visual UI | Check all AI buttons across pages |
| Fundamental card in position | FUND-03, FUND-04 | Visual UI | Expand portfolio position, verify card |
| AI fundamental analysis | FUND-05 | Visual UI | Click AI analysis in fundamental card |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
