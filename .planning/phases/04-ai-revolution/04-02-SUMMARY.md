---
phase: 04-ai-revolution
plan: 02
subsystem: ui
tags: [deepseek, ai-chat, strategy, free-form, preview-panel]

requires:
  - phase: 04-ai-revolution plan 01
    provides: ATR, STOCHASTIC, VWAP, WILLIAMS_R indicator types + valueTo in StrategyCondition

provides:
  - Free-form AI chat mode replacing rigid 4-step quiz
  - StrategyPreviewPanel component showing live strategy parameters during conversation
  - StrategyDialog accepting initialContext and initialInstrument props for terminal seeding
  - Updated DeepSeek provider with free-form CHAT_SYSTEM_PROMPT and 14 indicators in tool schema

affects:
  - 04-03 (terminal-to-strategy seeding uses initialContext in StrategyDialog)

tech-stack:
  added: []
  patterns:
    - onStrategyExtracted callback pattern for live preview without committing
    - initialContext prop pattern for seeding AI dialog from external analysis

key-files:
  created:
    - src/components/strategy/strategy-preview-panel.tsx
  modified:
    - src/server/providers/ai/deepseek-provider.ts
    - src/components/strategy/ai-chat.tsx
    - src/components/strategy/strategy-dialog.tsx
    - src/components/strategy/index.ts

key-decisions:
  - "Replaced 4-step CHAT_SYSTEM_PROMPT with free-form dialog prompt — AI asks ONE clarifying question instead of sequential steps"
  - "onStrategyExtracted fires on every AI response with strategy (before Apply button) — live preview pattern"
  - "StrategyPreviewPanel is collapsible (expanded by default) to not clutter the dialog"
  - "initialContext renders as first assistant message pair to seed AI context from terminal analysis"

patterns-established:
  - "Preview callback: onStrategyExtracted vs onGenerated — extracted = real-time, generated = user confirmed"

requirements-completed:
  - AIREV-01
  - AIREV-02

duration: 15min
completed: 2026-03-25
---

# Phase 04 Plan 02: AI Revolution Free-Form Chat Summary

**Free-form AI strategy creation with live preview panel: replaced quiz-style CHAT_SYSTEM_PROMPT with open-ended dialog, added StrategyPreviewPanel showing strategy parameters in real time, extended StrategyDialog with initialContext/initialInstrument props for terminal seeding**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-25T20:00:00Z
- **Completed:** 2026-03-25T20:05:00Z
- **Tasks:** 2
- **Files modified:** 5 (1 created)

## Accomplishments

- Replaced rigid 4-step CHAT_SYSTEM_PROMPT with free-form dialog mode — AI reacts to what user wrote, not a fixed sequence
- Added 4 new indicators (ATR, STOCHASTIC, VWAP, WILLIAMS_R) and `valueTo` for BETWEEN conditions to the DeepSeek tool schema
- Created StrategyPreviewPanel component that updates live as AI extracts strategy parameters from conversation
- Updated StrategyDialog to render preview panel, accept initialContext for terminal-to-strategy seeding (used by Plan 03)

## Task Commits

1. **Task 1: Update DeepSeek provider — free-form system prompt + new indicators** - `bbaad22` (feat)
2. **Task 2: Refactor AiChat + create StrategyPreviewPanel + update StrategyDialog** - `15e76e5` (feat)

## Files Created/Modified

- `src/server/providers/ai/deepseek-provider.ts` - Free-form CHAT_SYSTEM_PROMPT, 14 indicators in VALID_INDICATORS, valueTo in tool schema
- `src/components/strategy/ai-chat.tsx` - onStrategyExtracted + initialContext props, free-form greeting, getInitialMessages()
- `src/components/strategy/strategy-preview-panel.tsx` - NEW: collapsible panel showing strategy name, badges, conditions, risks
- `src/components/strategy/strategy-dialog.tsx` - initialContext + initialInstrument props, extractedStrategy state, StrategyPreviewPanel render
- `src/components/strategy/index.ts` - Added StrategyPreviewPanel export

## Decisions Made

- Free-form prompt asks AI to call `create_strategy` when it has "instrument + at least one indicator OR trading style" — low threshold to avoid over-questioning
- `onStrategyExtracted` fires immediately when AI returns strategy via tool call (before user clicks Apply), enabling live preview
- `getInitialMessages()` function prepends terminal context as assistant message pair when `initialContext` is provided
- `StrategyPreviewPanel` uses `getIndicatorConfig()` for human-readable indicator labels

## Deviations from Plan

None - plan executed exactly as written.

Note: Plan 04-01 had already added IndicatorType union values, valueTo to StrategyCondition, and indicator configs to indicators.ts. Task 1 only needed to update deepseek-provider.ts (VALID_INDICATORS, prompts, tool schema).

## Issues Encountered

None - pre-existing TypeScript errors in test files only (fifo-calculator.test.ts, operation-service.test.ts) — not caused by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- StrategyDialog now accepts `initialContext` and `initialInstrument` props — ready for Plan 03 to wire terminal → strategy flow
- `StrategyPreviewPanel` is exported and tested via TypeScript compilation
- All indicators (ATR, STOCHASTIC, VWAP, WILLIAMS_R) are in the AI tool schema so AI can generate strategies using them

---
*Phase: 04-ai-revolution*
*Completed: 2026-03-25*
