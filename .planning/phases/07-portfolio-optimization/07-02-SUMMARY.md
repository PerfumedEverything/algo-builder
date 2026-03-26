---
phase: 07-portfolio-optimization
plan: 02
subsystem: portfolio-analytics-ui
tags: [markowitz, optimization, recharts, ai-analysis, portfolio]
dependency_graph:
  requires: [07-01]
  provides: [markowitz-ui, rebalancing-ui, full-ai-analysis]
  affects: [portfolio-page]
tech_stack:
  added: []
  patterns: [server-actions, recharts-donut, ai-prompt-assembly]
key_files:
  created:
    - src/components/portfolio/markowitz-comparison.tsx
    - src/components/portfolio/rebalancing-actions.tsx
  modified:
    - src/core/config/ai-prompts.ts
    - src/server/actions/analytics-actions.ts
    - src/app/(dashboard)/portfolio/page.tsx
decisions:
  - Shared color palette across both donuts via index-based COLORS array
  - Filter HOLD actions from rebalancing table display
  - AI context assembles sectors, correlations, Markowitz weights, top positions into single message
metrics:
  duration: 10 min
  completed: "2026-03-26T20:12:28Z"
  tasks: 2
  files: 5
---

# Phase 07 Plan 02: Markowitz UI + AI Analysis Summary

Server actions, UI components, and full AI portfolio analysis for Markowitz optimization display with side-by-side donut charts and rebalancing actions table.

## What Was Done

### Task 1: Server actions + AI prompt + UI components (d3c09d1)
- Added `fullPortfolio` to `AiAnalysisBlock` union type and `AI_PROMPTS` record with comprehensive 4-dimension analysis prompt
- Created `getMarkowitzOptimizationAction` server action wrapping the service method
- Created `getFullPortfolioAiAnalysisAction` that assembles portfolio context (sectors, correlations, Markowitz weights, top positions) and sends to AI
- Built `MarkowitzComparison` component with two side-by-side recharts PieChart donuts (current vs optimal weights) plus stats row
- Built `RebalancingActions` component with BUY/SELL table (green/red with ArrowUpCircle/ArrowDownCircle icons)

### Task 2: Wire into portfolio page (e2c55b4)
- Added Markowitz state and parallel fetch in `fetchAnalytics`
- Placed optimization grid (MarkowitzComparison + RebalancingActions) below trade success section
- Added centered "Full AI Portfolio Analysis" button at bottom of analytics tab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing 07-01 types**
- **Found during:** Task 1 build verification
- **Issue:** Worktree branch was created before 07-01 merged, so MarkowitzResult type was missing
- **Fix:** Merged main repo HEAD (ac921b7) containing 07-01 commits into worktree
- **Files affected:** src/core/types/analytics.ts, src/server/services/portfolio-analytics-service.ts

## Known Stubs

None - all components are wired to real data sources via server actions.

## Self-Check: PASSED
