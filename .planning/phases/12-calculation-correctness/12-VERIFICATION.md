---
phase: 12-calculation-correctness
verified: 2026-03-28T13:50:00Z
status: passed
score: 17/17 must-haves verified
gaps: []
human_verification:
  - test: "Open portfolio page with active strategies having real operations"
    expected: "Portfolio total shows sum of real BUY amounts (e.g., 9780 not 10000 budget). Strategy card Позиция line shows cost basis."
    why_human: "Requires real Supabase data and live browser rendering — can't verify amount display correctness programmatically"
---

# Phase 12: Calculation Correctness Verification Report

**Phase Goal:** Все финансовые расчёты корректны до копейки — P&L, средняя цена входа, бэктест с реальной оценкой условий, валидация свечей, портфель показывает реальные суммы операций

**Verified:** 2026-03-28T13:50:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sharpe, Sortino, VaR, maxDrawdown computed via @railpath/finance-toolkit | VERIFIED | `risk-calculations.ts` imports `calculateSharpeRatio`, `calculateSortinoRatio`, `calculateVaR`, `calculateMaxDrawdown`; no `quantileSorted` present |
| 2 | Correlation matrix computed via library (not nested loop) | VERIFIED | `correlation-service.ts` uses `calculateCorrelationMatrix`; no `sampleCorrelation` import |
| 3 | Library results match manual calculation on 3 test datasets | VERIFIED | 5 tests in `describe("@railpath/finance-toolkit validation — 3 datasets (CALC-03)")` all pass |
| 4 | Every candle passes validateOHLC before calculations | VERIFIED | `broker-service.ts` calls `filterValidCandles(candles)` before returning in `getCandles()` |
| 5 | Broken candles (high<low, neg volume, future time) logged and excluded | VERIFIED | `filterValidCandles` uses `console.warn("[CandleValidator]")`; 8 tests confirm 3 broken types |
| 6 | FifoCalculator has 6 named scenarios with exact kopek numbers | VERIFIED | `describe("CALC-07: 6 spec scenarios with exact kopek numbers")` with Scenario 1-6 in `fifo-calculator.test.ts` |
| 7 | Average entry price correct with multiple entries | VERIFIED | CALC-08 test: `5@100 + 5@120 => avgPrice = 110` passes |
| 8 | Unrealized P&L correct after partial close | VERIFIED | CALC-09 test: `10@100, sell 4@120 => totalPnl = 90` passes |
| 9 | BacktestService parses entryConditions and exitConditions | VERIFIED | `backtest-service.ts` has `JSON.parse(params.entryConditions)` and `JSON.parse(params.exitConditions)` |
| 10 | Each backtest candle computes indicators via IndicatorCalculator | VERIFIED | `computeIndicators()` in `backtest-service.ts` calls per-indicator static methods per candle window |
| 11 | Entry only when ALL conditions met (AND), exit on ANY or TP/SL | VERIFIED | `evaluateBacktestConditions(entryPayload.conditions, entryPayload.logic ?? "AND")` + `evaluateBacktestConditions(exitPayload.conditions, "OR")` |
| 12 | RSI<30 entry / RSI>70 exit test on known data passes | VERIFIED | CALC-13 describe in `backtest-service.test.ts` with 3 tests including stub-gone proof; all pass |
| 13 | getSignal returns null when conditions not met | VERIFIED | Test "getSignal stub behavior is gone" confirms all 45 candle signals return null for never-met condition |
| 14 | Portfolio size = sum(real BUY operation amounts), not budget | VERIFIED | CALC-14 test + `paper-portfolio-view.tsx` line 91: `totalInitial = rows.reduce((s, r) => s + r.stats.initialAmount, 0)` |
| 15 | Strategy card Позиция = initialAmount (cost basis) | VERIFIED | `strategy-card.tsx` line 131: `{formatAmount(stats.initialAmount)} ₽` — `currentAmount` not used on Позиция line |
| 16 | P&L% = totalPnl / totalInvested * 100 | VERIFIED | CALC-16 test passes; `paper-portfolio-view.tsx` uses `totalInitial` for P&L% |
| 17 | Budget 10000, purchase 9780 → portfolio shows 9780 | VERIFIED | CALC-17 tests: `actualAmount = 9780` not `10000` passes |

**Score:** 17/17 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/services/risk-calculations.ts` | Wrapper functions using @railpath/finance-toolkit | VERIFIED | Contains `calculateSharpeRatio`; 121 lines; exports sharpe, sortino, var95, maxDrawdown |
| `src/server/services/correlation-service.ts` | Correlation matrix using library | VERIFIED | Contains `calculateCorrelationMatrix`; no `sampleCorrelation` |
| `src/__tests__/risk-calculations.test.ts` | 3 dataset validation tests | VERIFIED | 244 lines (>= 200 required); contains `@railpath/finance-toolkit validation` describe block |
| `src/server/services/candle-validator.ts` | validateOHLC + filterValidCandles | VERIFIED | 27 lines; exports both functions |
| `src/__tests__/candle-validator.test.ts` | 3 broken candle type tests | VERIFIED | 62 lines (>= 50); 8 tests covering high<low, neg volume, future time |
| `src/__tests__/fifo-calculator.test.ts` | 6 spec scenarios with exact amounts | VERIFIED | 302 lines (>= 230); Scenarios 1-6 present with exact numbers |
| `src/server/services/evaluate-conditions.ts` | evaluateBacktestConditions export | VERIFIED | 53 lines; exports `evaluateBacktestCondition` and `evaluateBacktestConditions` |
| `src/server/services/backtest-service.ts` | Real condition evaluation in getSignal | VERIFIED | Contains `evaluateBacktestConditions`, `inPosition` state, `exitPayload` parsing |
| `src/components/strategy/strategy-card.tsx` | Strategy card showing initialAmount | VERIFIED | Line 131: `stats.initialAmount` on Позиция line |
| `src/__tests__/portfolio-amounts.test.ts` | Tests for portfolio amount correctness | VERIFIED (minor) | 69 lines (plan spec: 80); all 6 tests covering CALC-14 through CALC-17 present and passing |

**Note on portfolio-amounts.test.ts line count:** File has 69 lines vs plan's `min_lines: 80`. All required tests are present and pass — the file is more compact than the plan template but covers the same behaviors. Not a functional gap.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `risk-service.ts` | `risk-calculations.ts` | `import { sharpe, maxDrawdown, var95 }` | WIRED | Confirmed in risk-service.ts lines 6-16 |
| `risk-calculations.ts` | `@railpath/finance-toolkit` | `import { calculateSharpeRatio }` | WIRED | Confirmed in risk-calculations.ts lines 2-7 |
| `broker-service.ts` | `candle-validator.ts` | `import { filterValidCandles }` | WIRED | Confirmed in broker-service.ts line 4; called on line 65 |
| `backtest-service.ts` | `evaluate-conditions.ts` | `import { evaluateBacktestConditions }` | WIRED | Confirmed in backtest-service.ts line 5; called on lines 183, 200 |
| `backtest-service.ts` | `candle-validator.ts` | `import { filterValidCandles }` | WIRED | Confirmed in backtest-service.ts line 7; called on line 164 |
| `strategy-card.tsx` | `OperationService.getStats()` via `stats.initialAmount` | `stats.initialAmount` on Позиция line | WIRED | Confirmed line 131 |
| `paper-portfolio-view.tsx` | `OperationService.getStats()` via `totalInitial` | `totalInitial = sum(stats.initialAmount)` | WIRED | Confirmed line 91 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `strategy-card.tsx` | `stats.initialAmount` | `OperationService.getStats()` → `totalBuyAmount = sum(op.amount for BUY ops)` | Yes — computed from real DB operations | FLOWING |
| `paper-portfolio-view.tsx` | `totalInitial` | `rows.reduce(s + r.stats.initialAmount)` → same OperationService source | Yes | FLOWING |
| `risk-calculations.ts` | Sharpe/VaR/maxDrawdown | `@railpath/finance-toolkit` library calls with real candle-derived returns | Yes | FLOWING |
| `correlation-service.ts` | `matrix` | `calculateCorrelationMatrix` with broker candle returns | Yes | FLOWING |
| `backtest-service.ts` | `indicators` | `computeIndicators(window, allConditions)` using `IndicatorCalculator` static methods on real candles | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 97 phase tests pass | `npx vitest run [6 test files]` | `6 passed (6)`, `97 passed (97)` | PASS |
| risk-calculations uses library (no quantileSorted) | grep in risk-calculations.ts | No matches | PASS |
| broker-service filters candles | grep filterValidCandles in broker-service.ts | Line 4 import + line 65 usage | PASS |
| strategy-card uses initialAmount on Позиция | grep on strategy-card.tsx | Line 131 confirmed | PASS |
| backtest getSignal not unconditionally returning long | Checked backtest-service.ts | `inPosition` gate + `evaluateBacktestConditions` gate present | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CALC-01 | 12-01-PLAN | Sharpe/Sortino/VaR/maxDrawdown via @railpath/finance-toolkit | SATISFIED | risk-calculations.ts uses library; 5 dataset validation tests pass |
| CALC-02 | 12-01-PLAN | Correlation matrix via library function | SATISFIED | correlation-service.ts uses calculateCorrelationMatrix |
| CALC-03 | 12-01-PLAN | Library results match manual calc on 3 datasets | SATISFIED | 3 datasets (returns, volatile returns, prices) tested; all pass within tolerance |
| CALC-04 | 12-02-PLAN | Every candle passes validateOHLC before calculations | SATISFIED | broker-service.getCandles filters via filterValidCandles |
| CALC-05 | 12-02-PLAN | Broken candles logged and excluded | SATISFIED | console.warn("[CandleValidator]") confirmed; test verifies logging |
| CALC-06 | 12-02-PLAN | Tests confirm 3 broken candle type filtering | SATISFIED | 3 named tests in candle-validator.test.ts for high<low, neg volume, future time |
| CALC-07 | 12-02-PLAN | FIFO P&L covered 100% — 6 scenarios with exact numbers | SATISFIED | describe("CALC-07: 6 spec scenarios") with Scenarios 1-6 all pass |
| CALC-08 | 12-02-PLAN | Average entry price correct with multiple entries | SATISFIED | `5@100 + 5@120 => avgPrice = 110` passes |
| CALC-09 | 12-02-PLAN | Unrealized P&L correct on partial close | SATISFIED | `10@100, sell 4@120 => totalPnl = 90` passes |
| CALC-10 | 12-03-PLAN | BacktestService parses entryConditions/exitConditions | SATISFIED | JSON.parse on both present in backtest-service.ts |
| CALC-11 | 12-03-PLAN | Each candle computes indicators and checks conditions | SATISFIED | computeIndicators() called per candle window in getSignal closure |
| CALC-12 | 12-03-PLAN | Entry ALL conditions, exit ANY or TP/SL | SATISFIED | AND logic for entry (entryPayload.logic), OR logic for exit confirmed |
| CALC-13 | 12-03-PLAN | RSI<30/RSI>70 test on known data passes | SATISFIED | CALC-13 describe with 3 tests; stub-gone test proves null returned for never-met RSI<10 |
| CALC-14 | 12-04-PLAN | Portfolio size = sum(real BUY amounts), not budget | SATISFIED | paper-portfolio-view.tsx totalInitial = stats.initialAmount; test passes |
| CALC-15 | 12-04-PLAN | Strategy card Позиция = initialAmount | SATISFIED | strategy-card.tsx line 131 uses stats.initialAmount; CALC-15 test reads source and passes |
| CALC-16 | 12-04-PLAN | P&L% = totalPnl / totalInvested * 100 | SATISFIED | paper-portfolio-view.tsx uses totalInitial for P&L%; CALC-16 test passes |
| CALC-17 | 12-04-PLAN | Budget 10000, purchase 9780 => shows 9780 | SATISFIED | CALC-17 tests verify `actualAmount = 9780` not `10000` |

All 17 requirements satisfied. No orphaned requirements found — requirements file marks CALC-10 through CALC-13 as `[x]` complete (with checkboxes), CALC-01 through CALC-09 and CALC-14 through CALC-17 as `[ ]` (tracked but not yet ticked in source). All are implemented by this phase.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | No stubs, TODOs, or placeholder returns found in phase 12 files |

Checked files: `risk-calculations.ts`, `correlation-service.ts`, `candle-validator.ts`, `broker-service.ts`, `backtest-service.ts`, `evaluate-conditions.ts`, `strategy-card.tsx`. No TODO/FIXME, no `return []` / `return {}` stubs, no unconditional `return { position: "long" }` in getSignal.

### Human Verification Required

#### 1. Portfolio Amount Display in Live UI

**Test:** Open the portfolio page with active strategies that have real BUY operations. Check that:
- The strategy card "Позиция" field shows the sum of actual BUY operation amounts (e.g., if you bought 10 lots at 978 rub, it shows 9780 rub — not the strategy's 10000 rub budget)
- The portfolio total "Портфель" shows the same cost-basis total

**Expected:** All amount fields reflect real transaction amounts from the operations table, not the configured budget.

**Why human:** Requires live Supabase data and browser rendering. The code change (stats.initialAmount) is verified programmatically, but visual correctness with real data needs manual inspection.

### Gaps Summary

No gaps found. All 17 requirements are implemented, all key links are wired, all tests pass (97/97), no stub code detected. The only minor deviation is that `portfolio-amounts.test.ts` has 69 lines instead of the plan's specified `min_lines: 80`, but all required test cases are present and passing — the file is simply more compact than the plan template.

---

_Verified: 2026-03-28T13:50:00Z_
_Verifier: Claude (gsd-verifier)_
