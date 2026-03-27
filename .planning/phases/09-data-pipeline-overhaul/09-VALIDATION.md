---
phase: 9
slug: data-pipeline-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DPIPE-01 | unit | `npx vitest run src/server/services/__tests__/indicator-calculator.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | DPIPE-02 | unit | `npx vitest run src/server/services/__tests__/indicator-calculator.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | DPIPE-04 | unit | `npx vitest run src/lib/__tests__/moex-session.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | DPIPE-05 | unit | `npx vitest run src/lib/__tests__/candle-cache.test.ts` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | DPIPE-03 | integration | `npx vitest run src/server/services/__tests__/backtest.test.ts` | ❌ W0 | ⬜ pending |
| 09-04-01 | 04 | 2 | DPIPE-06 | unit | `npx vitest run src/server/services/__tests__/indicator-accuracy.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for indicator migration (RSI, SMA, EMA, MACD, Bollinger, ATR, Stochastic, VWAP, Williams %R)
- [ ] Test stubs for MOEX session normalization (timezone, boundaries, holidays)
- [ ] Test stubs for candle cache (hit/miss, incremental update, TTL)
- [ ] TradingView reference fixture data for SBER (RSI-14, SMA-20, EMA-12 values captured manually)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Terminal price bar shows correct daily values | DPIPE-04 | Visual verification against TradingView | Open terminal, select SBER, compare %, H, L, Vol with TradingView |
| Indicator values match TradingView | DPIPE-07 | Cross-platform comparison | Run indicator on SBER 1h, compare RSI/SMA/EMA with TradingView screenshot |
| Audit report accuracy | DPIPE-08 | Document review | Review generated audit report for completeness |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
