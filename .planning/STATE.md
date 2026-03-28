---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: AI Revolution + Deep Analytics
status: Phase complete — ready for verification
stopped_at: Completed 10-04-PLAN.md
last_updated: "2026-03-28T06:41:48.312Z"
progress:
  total_phases: 19
  completed_phases: 17
  total_plans: 54
  completed_plans: 51
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** AI-помощник, который думает вместе с трейдером — свободный диалог, автоматическое создание стратегий, глубокая аналитика портфеля лучше чем у Т-Инвест.
**Current focus:** Phase 10 — security-code-quality-hardening

## Current Position

Phase: 10 (security-code-quality-hardening) — EXECUTING
Plan: 4 of 4

## Performance Metrics

**Velocity:**

- Total plans completed: 3 (v1.1)
- Average duration: ~10 min
- Total execution time: ~31 min

**By Phase:**

| Phase | Plans | Tasks | Files |
|-------|-------|-------|-------|
| Phase 04 P01 | 6 min | 2 tasks | 8 files |
| Phase 04 P02 | 15 min | 2 tasks | 5 files |
| Phase 04 P03 | 10 min | 2 tasks | 5 files |
| Phase 04.1-ai-ux-polish P01 | 8 | 1 tasks | 3 files |
| Phase 05 P01 | 381 | 2 tasks | 6 files |
| Phase 05.1 P01 | 3 | 4 tasks | 4 files |
| Phase 05.1 P02 | 4 | 5 tasks | 2 files |
| Phase 06 P01 | 4 | 5 tasks | 4 files |
| Phase 06 P02 | 7 | 5 tasks | 5 files |
| Phase 06.1 P01 | 5 | 2 tasks | 5 files |
| Phase 06.1 P02 | 3 | 2 tasks | 7 files |
| Phase 06.2 P01 | 5 | 2 tasks | 5 files |
| Phase 06.2 P02 | 5 | 2 tasks | 4 files |
| Phase 07 P01 | 4 | 1 tasks | 3 files |
| Phase 07 P02 | 10 | 2 tasks | 5 files |
| Phase 07.1 P01 | 5 | 2 tasks | 7 files |
| Phase 07.1 P02 | 372 | 2 tasks | 10 files |
| Phase 09 P02 | 2 | 2 tasks | 4 files |
| Phase 09 P01 | 8 | 2 tasks | 5 files |
| Phase 09 P04 | 8 | 3 tasks | 5 files |
| Phase 09 P03 | 8 | 3 tasks | 3 files |
| Phase 09 P05 | 7 | 3 tasks | 7 files |
| Phase 09 P07 | 5 | 1 tasks | 1 files |
| Phase 09 P06 | 5 | 2 tasks | 4 files |
| Phase 08 P01 | 3 | 1 tasks | 4 files |
| Phase 08 P02 | 5 | 2 tasks | 2 files |
| Phase 08 P03 | 3 | 2 tasks | 4 files |
| Phase 08 P04 | 8 | 1 tasks | 3 files |
| Phase 10 P03 | 51 | 1 tasks | 2 files |
| Phase 10 P02 | 2 | 2 tasks | 4 files |
| Phase 10 P01 | 13 | 2 tasks | 4 files |
| Phase 10 P04 | 19 | 2 tasks | 15 files |

## Accumulated Context

### Decisions

- v1.1 start: AI quiz replaced with free-form thinking dialog — Anton feedback s38
- v1.1 start: Top movers backend already done (getTopMovers()), only UI needed
- v1.1 start: simple-statistics covers Markowitz math, no new math library needed
- v1.1 start: @nivo/heatmap + recharts are only 2 new packages needed
- [Phase 04]: BETWEEN condition is inclusive on both bounds; valueTo added to StrategyCondition and SignalCondition
- [Phase 04]: Free-form AI chat replaces 4-step quiz
- [Phase 04]: StrategyPreviewPanel shows live strategy preview via onStrategyExtracted callback
- [Phase 04]: AiAnalysisButton fires onResult immediately on success
- [Phase 04]: ConditionBuilder BETWEEN clears valueTo on condition type switch
- [Phase 4.1]: Wizard flow (3-step) chosen: Анализ → Стратегия → Настройка — Anton decision
- [Phase 4.1]: Insert phase instead of micro-fixes — batch polish properly
- [Phase 04.1]: Use hidden class for wizard step panels to prevent AiChat remounting
- [Phase 04.1]: AiWizardDialog resets all state on open via useEffect([open])
- [Phase 05]: Added @vitejs/plugin-react + jsdom to enable React component testing with vitest
- [Phase 05]: TopMoversPanel shown in both terminal states: no-instrument (discovery) and instrument-selected
- [Phase 05.1]: BrokerService + PriceCache fallback reused for paper portfolio pricing
- [Phase 05.1]: LAST_PRICE_DEALER for T-Invest app price parity, expanded classCode preference list
- [Phase 06]: recharts was pre-installed; FUNDAMENTALS_MAP used for static sector lookup over MOEX ISS API (medium confidence)
- [Phase 06]: Analytics lazy-loaded on tab click to avoid slowing portfolio initial load
- [Phase 06]: Correlation heatmap uses Tailwind grid (not charting lib) for full cell customization
- [Phase 06.1]: TYPE_COLORS keys use lowercase strings matching PortfolioPosition.instrumentType.toLowerCase() output: stock, etf, bond, currency, futures
- [Phase 06.1]: getBenchmarkComparison returns null on error/no-data — UI must handle gracefully
- [Phase 06.1]: getStatsForStrategies batch replaces per-strategy await loop — eliminates N+1 in trade success
- [Phase 06.1]: handleCorrelationPeriodChange only refetches correlation (not full analytics) — faster period change UX
- [Phase 06.1]: InstrumentPnlTable reads from tradeSuccessBreakdown.byInstrument — no separate action needed
- [Phase 06.2]: shared-constants.ts for cross-process PREFERRED_CLASS_CODES between worker and Next.js
- [Phase 06.2]: Redis set requested-instruments with 5min TTL for dynamic terminal subscription signaling
- [Phase 06.2]: Compute stats manually from filtered ops when date filter active (getStats queries all ops internally)
- [Phase 06.2]: Hide parent grid wrapper when both PositionsPanel and TradeHistoryPanel are empty
- [Phase 07]: RF rate 0.16 (CBR key rate) for Sharpe, 10k Monte Carlo iterations, multi-pass concentration cap at 0.4
- [Phase 07]: Shared color palette across both donuts; HOLD actions filtered from rebalancing display; AI context assembles all analytics into single prompt
- [Phase 07.1]: PortfolioHealthService uses static pure methods; Markowitz types kept as deprecated stubs for Plan 02 cleanup
- [Phase 07.1]: Promise.allSettled for per-metric error isolation in analytics actions
- [Phase 07.1]: PortfolioHealthService imported client-side (pure data deps, no server-only)
- [Phase 07.1]: Health score card replaces Markowitz donuts in analytics tab first position
- [Phase 09]: MSK_OFFSET_MS exported as named constant to avoid hardcoding UTC+3 across modules
- [Phase 09]: CANDLE_TTL_MAP 1m raised 60s->4h, 5m->12h, 15m->24h, 1h->48h for 500+ candle warmup
- [Phase 09]: BollingerBands in trading-signals requires period+1 candles for isStable (vs period in old library)
- [Phase 09]: getCandleRangeMs extended: 1m=7d, 5m=14d, 15m=30d, 1h=60d for 500+ candle warmup guarantee
- [Phase Phase 09]: BacktestService uses static class with initialized guard — backtest-kit registers global state, must not re-initialize per request
- [Phase Phase 09]: runBacktest() throws NotImplementedError for Phase 9 scope — full Backtest API integration deferred to AI backtest preview phase
- [Phase 09]: aggregateSessionStats extracted as pure function separate from server action for clean unit testing without auth/broker mocks
- [Phase 09]: dailyStats state replaces todayOpen in terminal page for session-level H/L/Vol/% change independent of chart period
- [Phase Phase 09]: aggregateSessionStats extracted to session-stats.ts — non-async exports in use-server files cause Next.js Turbopack build failures
- [Phase Phase 09]: SBER_FIXTURE expected values computed inline using standard math formulas for self-consistency rather than live TradingView scraping
- [Phase 09]: TRADINGVIEW_REFERENCE values hardcoded as numeric constants computed by IndicatorCalculator — self-consistency test detects algorithm drift, manual TradingView verification needed for true external validation
- [Phase 09]: BacktestService.runBacktest() registers unique dynamic strategy schema per call (bt-{ts}-{rand}) to avoid backtest-kit global name collisions
- [Phase 09]: entryConditions JSON carries risks for getSignal TP/SL computation — full indicator evaluation deferred to AI backtest preview phase
- [Phase 08]: AiContextService uses static assembleContext with Promise.allSettled for parallel fetch and partial failure isolation
- [Phase 08]: SENIOR_TIMEFRAME exported as named constant: 1m->5m, 5m->15m, 15m->1h, 1h->4h, 4h->1d, 1d->1w
- [Phase 08]: deepseek-reasoner for analysis streaming, deepseek-chat for strategy creation with tool_calls
- [Phase 08]: reasoning_content stripped from apiMessages to prevent DeepSeek API 400 errors
- [Phase 08]: useAiStream hook encapsulates all SSE logic — AiChat stays presentational
- [Phase 08]: ThinkingIndicator and QuickActionButtons extracted to keep ai-chat.tsx under 150 lines
- [Phase 08]: Conversation NOT reset after strategy creation — addSystemMessage used for continuity
- [Phase Phase 08]: BacktestPreview shown after StrategyForm.onSuccess — wizard stays open, user sees 3-month backtest results inline in form step
- [Phase Phase 08]: Removed setChatKey increment from handleProceedToStrategy — chat no longer resets when navigating analysis→strategy, preserving conversation continuity
- [Phase 10]: MIME_TO_EXT map derives upload extension from file.type instead of filename to prevent spoofing
- [Phase 10]: Redis requirepass + 256mb maxmemory + allkeys-lru via Docker Compose command arg, REDIS_URL must include password
- [Phase 10]: checkRateLimit uses Redis INCR+EXPIRE for atomic sliding window rate limiting
- [Phase 10]: SEC-05 role filter applied at both route level and DeepSeek provider level for defense-in-depth
- [Phase 10]: userId param in repository methods is optional to preserve backward compatibility with internal callers that verify ownership upstream
- [Phase 10]: Middleware bypass uses exact pathname === for cron paths — prevents bypass via future paths like /api/signals/admin
- [Phase 10]: IDOR defense: load owned IDs server-side, filter client-supplied IDs through Set — never trust client-supplied entity IDs directly
- [Phase 10]: ai-strategy-validator.ts extracted as separate file — validateConfig logic needed its own home after ai-tools.ts grew over 150 lines during split

### Roadmap Evolution

- Phase 8 added: AI Assistant Deep Upgrade (thinking mode, rich context, streaming, portfolio awareness, backtest)
- Phase 6.1 inserted after Phase 6: Analytics Data Quality & Depth — fix correctness bugs + deeper metrics (URGENT)
- Phase 6.2 inserted after Phase 6.1: Realtime Prices & Anton UX Fixes — gRPC streaming prices, UX fixes from Anton doc (URGENT)
- Phase 7.1 inserted after Phase 7: Analytics Polish & Data Integrity — fix statistical validity, RF rate, data warnings (URGENT)
- Phase 9 added: Data Pipeline Overhaul — replace technicalindicators→trading-signals, integrate backtest-kit, MOEX candle normalization, Redis caching, terminal price bar fix, TradingView accuracy audit
- Phase 10 added: Security & Code Quality Hardening — auth bypasses, rate limiting, IDOR, prompt injection, input validation, file splitting (from comprehensive audit)
- Phase 11 added: Root Cause Bug Fixes — AI wizard strategy creation, period-based %, real amounts in portfolio, Telegram details, strategy auto-stop, operation volume, position mismatch (Anton feedback 2026-03-28)

### Pending Todos

- Confirm cohort primary dimension with Anton before Phase 6 starts (holding period vs sector)
- Verify live MOEX ISS sector endpoint behavior before Phase 6 (may need static fallback only)
- Anton feedback s34: verify duplicate notifications fix on prod
- TGLD @ ticker: may need DB cleanup for existing strategies with @ suffix

### Blockers/Concerns

- Phase 6: MOEX ISS sector API endpoint is MEDIUM confidence — validate during planning or use static map
- Phase 4: DeepSeek context reset after strategy creation defers multi-turn refinement — clarify with Anton if needed

## Session Continuity

Last session: 2026-03-28T06:41:48.307Z
Stopped at: Completed 10-04-PLAN.md
Resume file: None
Next: /gsd:plan-phase 6.2
