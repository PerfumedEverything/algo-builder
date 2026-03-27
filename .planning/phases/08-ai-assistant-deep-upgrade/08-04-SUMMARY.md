---
phase: 08-ai-assistant-deep-upgrade
plan: 04
subsystem: ui
tags: [backtest, ai-chat, wizard, strategy, streaming]

requires:
  - phase: 08-03
    provides: useAiStream hook with streaming, thinking mode, quick actions
  - phase: 08-02
    provides: AiContextService with enriched market data context

provides:
  - BacktestPreview component showing 3-month backtest results inline after strategy creation
  - Updated AiWizardDialog with conversation continuity (no chatKey reset on strategy step nav)
  - instrumentContext prop wired from wizard to AiChat for enriched AI responses
  - StrategyForm.onSuccess now passes strategyId for backtest trigger

affects: [strategy-form, ai-wizard-dialog, backtest, phase-09]

tech-stack:
  added: []
  patterns:
    - "BacktestPreview: pure presentational component receiving BacktestResult, loading, error props"
    - "Post-creation async trigger: onSuccess(strategyId?) → runBacktestAction without blocking form close"

key-files:
  created:
    - src/components/strategy/backtest-preview.tsx
  modified:
    - src/components/strategy/ai-wizard-dialog.tsx
    - src/components/strategy/strategy-form.tsx

key-decisions:
  - "BacktestPreview shown after StrategyForm.onSuccess — wizard stays open, user sees results in form step"
  - "StrategyForm.onSuccess(strategyId?) is backward compatible — all existing callers ignore the param"
  - "Removed setChatKey increment from handleProceedToStrategy — chat no longer resets when navigating analysis→strategy"
  - "instrumentContext defaults to timeframe 1h when initialInstrument present — wizard always has timeframe context"

requirements-completed: [AIUP-08]

duration: 8min
completed: 2026-03-27
---

# Phase 08 Plan 04: AI Wizard Backtest Preview + Conversation Continuity Summary

**BacktestPreview component added to wizard step 3 — strategy creation triggers automatic 3-month backtest with inline results (trades, win rate, P&L, drawdown), conversation no longer resets when navigating to strategy step, instrument context passed to AiChat for enriched AI responses.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T10:20:00Z
- **Completed:** 2026-03-27T10:28:00Z
- **Tasks:** 1 automated (1 checkpoint awaiting human verify)
- **Files modified:** 3

## Accomplishments

- Created `backtest-preview.tsx` — compact card with 4 metrics grid (trades, win rate, P&L, drawdown) plus optional Sharpe ratio, loading skeleton, error state
- Wired `runBacktestAction` in wizard `handleStrategyCreated` — fires after StrategyForm.onSuccess with 3-month date range and 100k position size
- Removed `setChatKey` increment from `handleProceedToStrategy` — conversation now persists across analysis→strategy navigation
- Added `instrumentContext` prop to AiChat in wizard — passes ticker + timeframe "1h" when initialInstrument is set
- Modified `StrategyForm.onSuccess` to accept optional `strategyId?: string` — backward-compatible change enabling backtest trigger

## Task Commits

1. **Task 1: Create BacktestPreview component and wire into wizard** - `3edadd4` (feat)

## Files Created/Modified

- `src/components/strategy/backtest-preview.tsx` — New component: inline backtest metrics card
- `src/components/strategy/ai-wizard-dialog.tsx` — Updated: backtest trigger, conversation continuity, instrument context
- `src/components/strategy/strategy-form.tsx` — Updated: onSuccess passes strategyId

## Decisions Made

- StrategyForm `onSuccess` callback changed from `() => void` to `(strategyId?: string) => void` — optional param ensures backward compatibility with all existing callers that ignore the argument
- Backtest fires after `onSuccess` (not before form close) so user sees results while dialog is still open
- `chatKey` increment only happens in `useEffect([open])` — chat mounts fresh on dialog reopen but persists during same wizard session

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ApiResponse type narrowing for backtest error access**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `res.error` inaccessible on `ApiResponse<BacktestResult>` union without narrowing — TS2339
- **Fix:** Changed `if (res.success && res.data)` to `if (res.success)` — proper discriminated union narrowing
- **Files modified:** src/components/strategy/ai-wizard-dialog.tsx
- **Verification:** `npx tsc --noEmit` no errors in modified files
- **Committed in:** 3edadd4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type narrowing bug)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

## Issues Encountered

None significant — TypeScript discriminated union narrowing required minor fix during compilation check.

## Checkpoint Pending Human Verification

**Task 2 (checkpoint:human-verify):** Full AI assistant upgrade flow end-to-end verification is pending.

**What to verify:**
1. Open terminal, select an instrument (e.g., SBER)
2. Click AI analysis button to open wizard
3. Wait for analysis to complete, click "Build strategy from analysis"
4. In AI chat: observe streaming text (characters appear one by one)
5. While AI thinks: verify "Analysing..." indicator appears with expandable reasoning
6. After AI proposes strategy: verify quick action buttons appear (Create, More variants, Adjust risks)
7. Click "Create this strategy" button
8. After creation: verify backtest preview appears (trades, win rate, P&L)
9. After creation: verify you can continue chatting — previous messages still visible
10. Verify no chat reset — previous messages still visible

## Next Phase Readiness

- Phase 08 complete — all 4 plans executed
- BacktestPreview available for reuse in other strategy-related UIs
- Conversation continuity established — users can iterate on strategy in same dialog session
- Pending: human verification of complete AI assistant upgrade flow end-to-end

---
*Phase: 08-ai-assistant-deep-upgrade*
*Completed: 2026-03-27*
