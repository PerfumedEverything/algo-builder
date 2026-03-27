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
| 09-01-01 | 01 | 1 | DPIPE-01 | unit | `npx vitest run src/__tests__/indicator-calculator.test.ts` | Yes (extend) | pending |
| 09-01-02 | 01 | 1 | DPIPE-02 | unit | `npx vitest run src/__tests__/indicator-calculator.test.ts` | Yes (extend) | pending |
| 09-02-01 | 02 | 1 | DPIPE-05 | unit | `npx vitest run src/__tests__/candle-normalizer.test.ts` | W0 | pending |
| 09-02-02 | 02 | 1 | DPIPE-06 | unit | `npx vitest run src/__tests__/price-cache.test.ts` | Yes (extend) | pending |
| 09-03-01 | 03 | 1 | DPIPE-04 | unit | `npx tsc --noEmit src/server/actions/chart-actions.ts` | Yes | pending |
| 09-03-02 | 03 | 1 | DPIPE-04 | unit | `npx tsc --noEmit` | Yes | pending |
| 09-03-03 | 03 | 1 | DPIPE-04 | unit | `npx vitest run src/__tests__/daily-session-stats.test.ts` | W0 | pending |
| 09-04-01 | 04 | 2 | DPIPE-03 | unit | `npx tsc --noEmit src/server/services/backtest-service.ts` | W0 | pending |
| 09-04-02 | 04 | 2 | DPIPE-03 | unit | `npx tsc --noEmit src/server/actions/backtest-actions.ts` | W0 | pending |
| 09-04-03 | 04 | 2 | DPIPE-03 | unit | `npx vitest run src/__tests__/backtest-service.test.ts` | W0 | pending |
| 09-05-01 | 05 | 2 | DPIPE-07 | unit | `npx vitest run src/__tests__/indicator-accuracy.test.ts` | W0 | pending |
| 09-05-02 | 05 | 2 | DPIPE-08 | manual | `npx tsx scripts/audit-indicators.ts` | W0 | pending |
| 09-05-03 | 05 | 2 | DPIPE-07 | unit | `npx vitest run --reporter=verbose` | Yes | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for indicator migration (RSI, SMA, EMA, MACD, Bollinger, ATR, Stochastic, VWAP, Williams %R)
- [ ] Test stubs for MOEX session normalization (timezone, boundaries, holidays)
- [ ] Test stubs for candle cache (hit/miss, incremental update, TTL)
- [ ] Test stubs for daily session stats aggregation (sessionOpen, high, low, volume)
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
