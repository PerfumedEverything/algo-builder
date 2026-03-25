---
phase: 04-ai-revolution
plan: "01"
subsystem: indicators
tags: [indicators, ATR, stochastic, VWAP, williams-r, BETWEEN, TDD]
dependency_graph:
  requires: []
  provides: [ATR, STOCHASTIC, VWAP, WILLIAMS_R indicators, BETWEEN condition]
  affects: [crossing-detector, strategy-builder, signal-checker]
tech_stack:
  added: []
  patterns: [TDD red-green, static class methods, null guard pattern]
key_files:
  created:
    - src/__tests__/indicator-calculator-new.test.ts
    - src/__tests__/crossing-detector-between.test.ts
  modified:
    - src/core/types/strategy.ts
    - src/core/types/signal.ts
    - src/core/schemas/strategy.ts
    - src/core/config/indicators.ts
    - src/server/services/indicator-calculator.ts
    - src/server/services/crossing-detector.ts
decisions:
  - "Used technicalindicators library for all 4 new indicator calculations"
  - "BETWEEN condition is inclusive on both bounds (>= lower AND <= upper)"
  - "valueTo added to both StrategyCondition and SignalCondition for BETWEEN range support"
  - "Stochastic returns last.k (not last.d) — matches the %K oscillator convention"
metrics:
  duration_min: 6
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 8
---

# Phase 04 Plan 01: New Indicators + BETWEEN Condition Summary

**One-liner:** ATR, Stochastic, VWAP, Williams %R via technicalindicators library with BETWEEN range condition and inclusive bound evaluation.

## What Was Built

Extended the indicator pipeline with 4 new technical indicators and the BETWEEN range condition:

- **4 new `IndicatorCalculator` static methods** — `calculateATR`, `calculateStochastic`, `calculateVWAP`, `calculateWilliamsR` using the `technicalindicators` library
- **Type/schema updates** — `IndicatorType` union and `indicatorTypeSchema` Zod enum extended, `valueTo` field added to `StrategyCondition` and `SignalCondition`
- **Config entries** — 4 new `IndicatorConfig` objects added to `INDICATORS` array with params and `allowedConditions`
- **BETWEEN logic** — `compareCondition` accepts optional `target2`, evaluates `actual >= target && actual <= target2`; returns false for undefined `target2`
- **Indicator routing** — `getIndicatorValue` in crossing-detector routes all 4 new indicators to their calculator methods
- **23 unit tests** — 12 for new indicators (null safety + value range), 11 for BETWEEN + getIndicatorValue routing

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend types, schemas, config + implement 4 new indicators | 849c580 | 6 files |
| 2 | BETWEEN condition + new indicator routing + tests | be5ff78 | 2 files |

## Verification

Full test suite: 22 passing test files, 277 passing tests.
Pre-existing failure: `moex-provider.test.ts` (6 tests) — unrelated MOEX API mock issue, existed before this plan.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all indicator calculations return real values from `technicalindicators` library.

## Self-Check: PASSED
