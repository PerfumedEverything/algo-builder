---
phase: 10
plan: 04
subsystem: server/providers/ai, server/services, server/actions
tags: [refactor, file-split, code-quality]
dependency_graph:
  requires: [10-01, 10-02]
  provides: [SEC-09]
  affects: [server/providers/ai, server/services, server/actions]
tech_stack:
  added: []
  patterns: [single-responsibility, module-extraction, barrel-re-export]
key_files:
  created:
    - src/server/providers/ai/ai-prompts.ts
    - src/server/providers/ai/ai-tools.ts
    - src/server/providers/ai/ai-strategy-validator.ts
    - src/server/actions/analytics-ai-prompt.ts
    - src/server/services/correlation-service.ts
    - src/server/services/portfolio-benchmark-service.ts
    - src/server/services/portfolio-dividend-service.ts
    - src/server/services/health-scoring-constants.ts
    - src/server/actions/paper-portfolio-actions.ts
  modified:
    - src/server/providers/ai/deepseek-provider.ts
    - src/server/actions/analytics-actions.ts
    - src/server/services/portfolio-analytics-service.ts
    - src/server/services/portfolio-health-service.ts
    - src/server/actions/operation-actions.ts
    - src/server/services/index.ts
decisions:
  - "ai-strategy-validator.ts extracted as separate file — validateConfig logic needed its own home after ai-tools.ts grew over 150 lines during split"
  - "portfolio-benchmark-service.ts and portfolio-dividend-service.ts extracted as standalone functions instead of classes — they don't need instance state"
  - "health-scoring-constants.ts contains both constants and pure scoring functions — follows principle of co-locating related pure logic"
  - "All original files re-export from new modules — backward compat maintained, no consumer code changes needed"
metrics:
  duration: "~19 min"
  completed: "2026-03-28"
  tasks_completed: 2
  files_created: 9
  files_modified: 6
---

# Phase 10 Plan 04: File Split 150-Line Enforcement Summary

Split all files exceeding 150 lines into focused single-responsibility modules per CLAUDE.md convention.

## What Was Built

9 new focused modules extracted from 5 oversized source files. All files now under 150 lines. Backward compatibility maintained via re-exports. TypeScript build clean (zero source errors).

## Splits Performed

### deepseek-provider.ts (407 lines → 123 lines)
- `ai-prompts.ts` — SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, INDICATOR_HINTS, RISK_PROFILES, randomItem
- `ai-tools.ts` — VALID_INDICATORS, VALID_CONDITIONS, VALID_TIMEFRAMES, generateStrategyTool
- `ai-strategy-validator.ts` — validateStrategyConfig

### analytics-actions.ts (221 lines → 128 lines)
- `analytics-ai-prompt.ts` — getFullPortfolioAiAnalysisAction (re-exported from original)

### portfolio-analytics-service.ts (287 lines → 134 lines)
- `correlation-service.ts` — CorrelationService class with getCorrelationMatrix (via CorrelationService delegation)
- `portfolio-benchmark-service.ts` — getBenchmarkComparison standalone function
- `portfolio-dividend-service.ts` — getAggregateDividendYield standalone function

### portfolio-health-service.ts (262 lines → 116 lines)
- `health-scoring-constants.ts` — scoreDiversification, scoreRisk, scorePerformance, buildDiversificationAdvice, buildCorrelationWarnings

### operation-actions.ts (199 lines → 88 lines)
- `paper-portfolio-actions.ts` — PaperStrategyRow type and getPaperPortfolioAction (re-exported from original)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing module] Added ai-strategy-validator.ts**
- **Found during:** Task 1 — after extracting VALID_INDICATORS/CONDITIONS to ai-tools.ts, the validateConfig method still needed to reference those constants, and adding it to ai-tools.ts pushed it over 150 lines
- **Fix:** Created separate `ai-strategy-validator.ts` for the validation logic
- **Files modified:** src/server/providers/ai/ai-strategy-validator.ts (new), src/server/providers/ai/deepseek-provider.ts
- **Commit:** 00685b2

**2. [Rule 1 - Split scope] Added portfolio-benchmark-service.ts and portfolio-dividend-service.ts**
- **Found during:** Task 2 — portfolio-analytics-service.ts was still 201+ lines after extracting CorrelationService, because getBenchmarkComparison and getAggregateDividendYield are large methods
- **Fix:** Extracted both as standalone functions to their own modules; PortfolioAnalyticsService delegates to them
- **Files modified:** src/server/services/portfolio-benchmark-service.ts (new), src/server/services/portfolio-dividend-service.ts (new)
- **Commit:** db0ecd9

## Self-Check: PASSED

All 9 created files found on disk. Both commits (00685b2, db0ecd9) verified in git log. TypeScript source files build clean.
