---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 02.3-01-PLAN.md
last_updated: "2026-03-25T08:52:24.856Z"
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 16
  completed_plans: 11
---

# Project State

## Project Reference

**AculaTrade** — algo trading builder platform (aculatrade.com)
Professional portfolio analytics, strategy automation, and built-in chart terminal.

## Current Position

Phase: 02.3 (strategy-portfolio-hardening) — EXECUTING
Plan: 3 of 4

## Progress

[███████░░░] 69% (11/16 plans complete)

## Completed Phases

1. **Infrastructure & Terminal** — MOEX provider, candlestick charts, terminal page, deposit tracker
2. **Risk Metrics** — Sharpe, Beta, VaR, Max Drawdown, Alpha with AI analysis

## Recent Decisions

- Security audit completed (2026-03-24): auth fixes, ownership checks, rate limiting
- Dead code cleanup, planning artifacts removed (restored)
- Strategy checker: atomic guards against race conditions (duplicate notifications fix)
- cleanTicker applied on save for @ suffix removal
- TradingView widget remounts on ticker change via key prop to prevent stale widget state (02.1-02)
- shadcn table component installed for consistent OrderBook table styling (02.1-02)
- formatChange uses Math.abs() + manual +/- prefix to avoid Russian locale double-minus (02.1-01)
- formatVolume K threshold at 10K per plan spec — numbers below 10K use plain Intl format (02.1-01)
- volume=0 in PriceBar since CandlestickData has no volume field and PriceUpdate SSE also lacks it (02.1-02)
- Position row click constructs minimal BrokerInstrument stub (type=STOCK, lot=1) for chart display (02.1-02)
- SUPPORT/RESISTANCE return null (not 0/Infinity) — null propagates to false condition, prevents false triggers (02.2-01)
- getIndicatorValue returns number | null in both checkers — null = insufficient data, condition returns false (02.2-01)
- evaluateCrossing/getIndicatorKey extracted to crossing-detector.ts for 150-line compliance (02.2-02)
- handleTriggered extracted to StrategyTriggerHandler class — strategy-checker.ts is 149 lines (02.2-02)
- ConditionProgress.current: number | null to propagate null indicator data to UI (02.2-02)
- SignalChecker delegates to crossing-detector.ts — DRY, single truth for both pipelines (02.2-03)
- SignalTriggerHandler extracted to signal-trigger-handler.ts — mirrors StrategyTriggerHandler (02.2-03)
- vitest.config.ts excludes .claude/worktrees — prevents stale agent test files from failing CI (02.2-03)
- LAST_PRICE_PREFIX removed, PRICE_TTL=120s, lock TTL=10s — no stale 7-day fallback, fresh prices for 1m/5m candle strategies (02.3-01)

## Pending Todos

- Anton feedback s34: verify duplicate notifications fix on prod
- Anton feedback s34: verify strategy card P&L display fix
- TGLD @ ticker issue: may need DB cleanup for existing strategies with @ suffix

## Session Continuity

Last session: 2026-03-25T08:52:24.853Z
Stopped at: Completed 02.3-01-PLAN.md
Next: Phase 3 (Fundamentals)
