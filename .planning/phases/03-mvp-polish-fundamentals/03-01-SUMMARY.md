---
phase: 03-mvp-polish-fundamentals
plan: "01"
subsystem: strategy-card
tags: [bugfix, ui, pnl, tooltips, tdd]
dependency_graph:
  requires: []
  provides: [correct-pnl-display, strategy-card-tooltips]
  affects: [strategy-card, operation-service]
tech_stack:
  added: []
  patterns: [tdd-red-green, component-extraction]
key_files:
  created:
    - src/components/strategy/strategy-card-conditions.tsx
    - src/components/strategy/strategy-card-ops.tsx
  modified:
    - src/server/services/operation-service.ts
    - src/components/strategy/strategy-card.tsx
    - src/__tests__/operation-service.test.ts
decisions:
  - "currentAmount=0 when holdingQty=0 (closed position has no market value)"
  - "Extracted StrategyCardConditions and StrategyCardOps to keep strategy-card.tsx at exactly 150 lines"
  - "STATUS_MAP combined STYLES+LABELS for line efficiency"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 5
---

# Phase 03 Plan 01: Strategy Card P&L Fix + Tooltips Summary

**One-liner:** Fixed closed-position `currentAmount=0` bug and extracted tooltip-based condition rendering into separate components.

## What Was Built

### Task 1: Fix OperationStats.currentAmount for closed positions (TDD)

Fixed bug in `operation-service.ts` where `currentAmount` was computed as `totalBuyAmount + pnl` even when `holdingQty=0`. After selling all shares, the position has no market value — it should be `0`.

**Fix:** Line 85 changed from:
```
currentAmount: totalBuyAmount + pnl
```
to:
```
currentAmount: holdingQty > 0 && currentPrice ? holdingQty * currentPrice : 0
```

Test cases updated/added:
- Closed position: `currentAmount=0`, `pnl=realized P&L only`
- Open position: `currentAmount=holdingQty * currentPrice`
- BUY+SELL pair: `currentAmount=0` (was asserting 10890)

All 12 tests in `operation-service.test.ts` pass.

### Task 2: Strategy card tooltips, closed-position display, 150-line compliance

Created two new helper components to reduce `strategy-card.tsx` from 314 lines to exactly 150:

**`strategy-card-conditions.tsx`** (~69 lines):
- Renders "Условие входа:" / "Условие выхода:" labels
- Each condition wrapped in Tooltip (TooltipProvider/TooltipTrigger/TooltipContent)
- Condition text has `cursor-help underline decoration-dotted` for hoverability
- TooltipContent shows indicator description from `INDICATORS` config

**`strategy-card-ops.tsx`** (~61 lines):
- Extracted operations table rendering (loading/empty/data states)

**`strategy-card.tsx`** updates:
- Closed position (`holdingQty === 0`): shows only "Результат: +X₽ (Y%)" — no portfolio sum
- Open position (`holdingQty > 0`): shows "Позиция: X₽" + P&L badge
- Uses `StrategyCardConditions` and `StrategyCardOps` sub-components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing extraction] Created strategy-card-ops.tsx for operations table**
- **Found during:** Task 2 — after extracting conditions, card was still at 283 lines
- **Issue:** Plan only mentioned extracting conditions component, but 150-line limit required extracting ops table too
- **Fix:** Created `strategy-card-ops.tsx` with table/loading/empty states
- **Files modified:** `src/components/strategy/strategy-card-ops.tsx` (new), `src/components/strategy/strategy-card.tsx`
- **Commit:** e4fe5b9

## Known Stubs

None — all data is wired. `currentAmount`, `pnl`, and `pnlPercent` flow from `OperationStats` returned by `OperationService.getStats()`.

## Self-Check: PASSED

All required files exist:
- FOUND: src/components/strategy/strategy-card-conditions.tsx
- FOUND: src/components/strategy/strategy-card-ops.tsx
- FOUND: src/components/strategy/strategy-card.tsx
- FOUND: src/server/services/operation-service.ts
- FOUND: src/__tests__/operation-service.test.ts

All commits exist:
- FOUND: e15ce21 (Task 1 — fix operation-service)
- FOUND: e4fe5b9 (Task 2 — strategy card improvements)
