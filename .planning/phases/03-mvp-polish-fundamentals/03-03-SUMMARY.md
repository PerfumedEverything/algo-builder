---
phase: 03-mvp-polish-fundamentals
plan: "03"
subsystem: strategy-dialog, portfolio-view, terminal
tags: [ai-chat, strategy, portfolio, ui-polish]
dependency_graph:
  requires: ["03-02"]
  provides: ["AI-first strategy creation", "deposit-based portfolio summary"]
  affects: ["strategy-dialog.tsx", "portfolio-view.tsx", "terminal/page.tsx"]
tech_stack:
  added: []
  patterns: ["conditional rendering via hidden class", "deposit-relative growth calculation"]
key_files:
  created: []
  modified:
    - src/components/strategy/strategy-dialog.tsx
    - src/components/broker/portfolio-view.tsx
    - src/app/(dashboard)/terminal/page.tsx
decisions:
  - "StrategyForm rendered always (hidden class) so ref works when AI fills fields before form is revealed"
  - "Summary block shown only when positions.length > 0 AND deposits data exists to avoid zero-state confusion"
  - "Growth calc: totalValue - netDeposited where netDeposited = totalDeposits - totalWithdrawals"
metrics:
  duration: "~4 minutes"
  completed: "2026-03-25"
  tasks_completed: 2
  files_modified: 3
---

# Phase 03 Plan 03: AI Chat Primary + Portfolio Summary Summary

AI chat made the default strategy creation mode; deposit-based portfolio summary block added; all AI analysis buttons unified to blue.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AI chat primary creation mode + blue AI buttons | abb1d64 | strategy-dialog.tsx, terminal/page.tsx |
| 2 | Portfolio summary block with deposit-based growth | 6a06f20 | portfolio-view.tsx |

## What Was Built

### Task 1: AI Chat as Primary Creation Mode (POL-10) + Blue Buttons (POL-02)

`strategy-dialog.tsx` restructured:
- Create mode: `AiChat` rendered first, prominently
- "или заполнить вручную" toggle button below (with rotating ChevronDown icon)
- `StrategyForm` rendered always but hidden via `className="hidden"` so `formRef` ref is always available
- When AI generates config, `handleGenerated` calls `setShowForm(true)` revealing the pre-filled form
- Edit mode: unchanged — StrategyForm only, no AiChat

`terminal/page.tsx`: AiAnalysisButton changed from `variant="outline"` to `variant="default"` (blue).

`risk-metrics-section.tsx` and `lot-analysis-dialog.tsx`: already used default variant (blue) — no changes needed.

### Task 2: Portfolio Summary Block (POL-01)

`portfolio-view.tsx` — new summary block at top:
- 4 cards: "Стоимость портфеля", "Внесено", "Доход / Убыток", "Рост"
- Growth = `totalValue - netDeposited` (where `netDeposited = totalDeposits - totalWithdrawals`)
- Growth % = `(growth / netDeposited) * 100`
- Color-coded: `text-emerald-400` positive, `text-red-400` negative
- Rendered conditionally: only when `portfolio.positions.length > 0 && deposits`

## Deviations from Plan

### Auto-noted adjustments

**1. [Rule 2 - Missing Critical] StrategyForm rendered always (hidden) rather than conditionally**
- **Found during:** Task 1 implementation
- **Issue:** If `StrategyForm` not rendered when AI fills fields, `formRef.current` is null and `setGeneralFields()` silently fails
- **Fix:** Used `className={mode === "create" && !showForm ? "hidden" : undefined}` to always keep form mounted
- **Files modified:** strategy-dialog.tsx

**2. Pre-existing test failures (out of scope)**
- `moex-provider.test.ts` has 6 failing tests unrelated to this plan
- Verified pre-existing before changes — deferred, not introduced by this plan

## Known Stubs

None — all data is wired to real props (`portfolio.totalAmount`, `deposits.totalDeposits`, `deposits.totalWithdrawals`).

## Self-Check: PASSED

Files created/modified exist:
- src/components/strategy/strategy-dialog.tsx: FOUND
- src/components/broker/portfolio-view.tsx: FOUND
- src/app/(dashboard)/terminal/page.tsx: FOUND

Commits:
- abb1d64: FOUND
- 6a06f20: FOUND
