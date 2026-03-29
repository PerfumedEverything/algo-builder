---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Корректный движок + Bybit + Pro Terminal
status: Phase complete — ready for verification
stopped_at: "Completed 15-grid-trading-04-PLAN.md (checkpoint: awaiting human-verify)"
last_updated: "2026-03-29T09:15:18.470Z"
progress:
  total_phases: 13
  completed_phases: 13
  total_plans: 36
  completed_plans: 36
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)
See: .planning/v2.0-SPEC.md (full spec)
See: .planning/REQUIREMENTS-v2.0.md (requirements)

**Core value:** Корректный торговый движок с точностью реальных денег. Профессиональный терминал. Мульти-брокер (T-Invest + Bybit). AI-помощник для трейдинга.
**Current focus:** Phase 15 — grid-trading

## Current Position

Phase: 15 (grid-trading) — EXECUTING
Plan: 5 of 5

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
| Phase 11-root-cause-bug-fixes P01 | 5 | 2 tasks | 3 files |
| Phase 11-root-cause-bug-fixes P02 | 10 | 2 tasks | 5 files |
| Phase 11-root-cause-bug-fixes P03 | 3 | 2 tasks | 4 files |
| Phase 12 P04 | 1 | 1 tasks | 2 files |
| Phase 12 P02 | 5 | 2 tasks | 4 files |
| Phase 12 P01 | 4 | 2 tasks | 5 files |
| Phase 12 P03 | 8 | 2 tasks | 4 files |
| Phase 14-bybit-provider-backend P02 | 8 | 2 tasks | 1 files |
| Phase 14-bybit-provider-backend P03 | 12 | 2 tasks | 6 files |
| Phase 14 P01 | 11 | 2 tasks | 16 files |
| Phase 14-bybit-provider-backend P04 | 7 | 2 tasks | 5 files |
| Phase 14 P05 | 3 | 2 tasks | 4 files |
| Phase 14-bybit-provider-backend P06 | 247 | 2 tasks | 5 files |
| Phase 14.2-moex-evening-session P01 | 7 | 2 tasks | 3 files |
| Phase 14.2 P02 | 5 | 1 tasks | 2 files |
| Phase 15-grid-trading P02 | 104 | 1 tasks | 3 files |
| Phase 15-grid-trading P01 | 207 | 2 tasks | 5 files |
| Phase 15-grid-trading P03 | 3 | 2 tasks | 4 files |
| Phase 15-grid-trading P05 | 118 | 2 tasks | 2 files |
| Phase 15-grid-trading P04 | 8 | 3 tasks | 7 files |

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
- [Phase 11]: sendMessage return value (not new callback) surfaces pendingStrategy — minimal API change, hook stays navigation-agnostic
- [Phase 11]: PAUSED-before-delete is sufficient defense for paper trading; no broker cancel step needed
- [Phase 11]: periodOpen defaults to sessionOpen for intraday periods — no extra API call needed for daily stats
- [Phase 11]: Exit P&L in Telegram = (sellPrice - buyPrice) * quantity — total not per-share
- [Phase 11]: Use initialAmount (sum of all BUY amounts) as currentAmount fallback — accounts for multiple buys at different prices
- [Phase 11]: portfolioSummary.totalPortfolio uses totalInitial from opsStatsMap — actual invested not config.risks.tradeAmount budget
- [Phase 12]: Strategy card Позиция = initialAmount (cost basis), not currentAmount (mark-to-market)
- [Phase 12]: validateOHLC checks 5 OHLC invariants; filterValidCandles logs [CandleValidator] warn per broken candle
- [Phase 12]: BrokerService.getCandles pipes provider output through filterValidCandles before returning (CALC-04/05)
- [Phase 12]: FIFO realized P&L for full-close deferred to OperationService.getStats — FifoCalculator only tracks unrealized
- [Phase 12]: @railpath/finance-toolkit replaces custom Sharpe/VaR/maxDrawdown math — maxDrawdown now takes prices[] not returns[], wrapper multiplies maxDrawdownPercent fraction by 100
- [Phase 12]: computeIndicators() function built inline in backtest-service.ts (not IndicatorCalculator) because no static calculate(candles, configs) batch method exists
- [Phase 12]: StrategyCondition.params.period replaces plan's cond.period — actual type uses params: Record<string, number>
- [Phase 14]: averagePositionPriceFifo with fallback to averagePositionPrice — handles sandbox/old T-Invest accounts without FIFO data
- [Phase 14]: TinkoffProvider.placeOrder/cancelOrder stubs throw NotImplementedError — satisfies BrokerProvider interface, real order placement deferred
- [Phase 14-bybit-provider-backend]: evaluateCrossing (sync, stateful) kept as backward-compat export — evaluateCrossingBatch (async, @ixjb94/indicators) is the new runtime path
- [Phase 14-bybit-provider-backend]: indicator-series.ts extracted as separate file — keeps indicator-calculator.ts under 150 lines
- [Phase 14]: getBrokerProvider is now async and user-aware, reads brokerType from DB per call
- [Phase 14]: backtest-service uses TinkoffProvider directly (backtest is MOEX-specific, no userId in static context)
- [Phase 14]: BybitProvider is a stub — full implementation in Plan 04; brokerType defaults to TINKOFF for backward compatibility
- [Phase 14-bybit-provider-backend]: PositionV5 from bybit-api used directly in mapPosition — avoids duplicate type definition
- [Phase 14-bybit-provider-backend]: vi.hoisted() required for mock instance shared in vi.mock factory (vitest hoisting limitation)
- [Phase 14-bybit-provider-backend]: BybitProvider uses regular function constructor mock in vitest — arrow functions cannot be used with new
- [Phase 14]: bybit-worker uses dedicated Dockerfile.bybit-worker (not main Dockerfile) to match price-worker pattern and avoid heavy Next.js build
- [Phase 14]: bybit-api exception event used instead of deprecated error event (types: UseTheExceptionEventInstead=never)
- [Phase 14-bybit-provider-backend]: getSystemPrompt/getIndicatorHints/getRiskProfiles conditional selectors added — BYBIT returns crypto prompts, TINKOFF returns RU prompts
- [Phase 14-bybit-provider-backend]: connectBybitAction validates credentials via getAccounts() before persisting — fail-fast on bad Bybit API keys
- [Phase 14.2]: inPreOpenAndMain || inEvening pattern: 09:50-18:40 MSK + 18:40-23:50 MSK covers MOEX full trading day including evening session
- [Phase 14.2]: fetchDailyStats called immediately on instrument select AND in 60s interval with isMarketOpen() guard — no 60s initial wait
- [Phase 14.2]: isInMoexSession inEvening boundary corrected: >= 1120 (18:40 MSK) not >= 1145 (19:05 MSK)
- [Phase 14.2]: Chart path confirmed to NOT use normalizeMoexCandles — evening candles pass through filterValidCandles unfiltered
- [Phase 15-grid-trading]: grid_orders uses snake_case columns with mapRow() camelCase conversion; service role RLS policy added for worker access
- [Phase 15-grid-trading]: GridEngine is pure stateless class with static methods — fully deterministic and testable without broker mocks
- [Phase 15-grid-trading]: IndicatorStrategyConfig type preserved with optional type INDICATOR for backward compat; new discriminated union StrategyConfig = IndicatorStrategyConfig | GridConfig
- [Phase 15-grid-trading]: vi.hoisted() used for mock instances in GridTradingService tests — arrow functions not constructors in Vitest
- [Phase 15-grid-trading]: processPriceTick passes pnlDelta per fill from GridTickResult — matches engine contract
- [Phase 15-grid-trading]: ATR(14) via IndicatorCalculator (trading-signals) for grid range — no custom math
- [Phase 15-grid-trading]: GridAiService: Range = currentPrice ± 2*ATR, clamped to 4% minimum; levels = range/(ATR*0.5) clamped [5,30]; DeepSeek reasoning with 10s timeout fallback
- [Phase 15-grid-trading]: InstrumentChart extended with gridLevels prop rather than exposing chartRef/seriesRef — cleaner API, no ref drilling
- [Phase 15-grid-trading]: grid-calculator.ts extracted as client-safe module separate from grid-engine.ts — prevents server dep leakage to form

### Roadmap Evolution

- Phase 8 added: AI Assistant Deep Upgrade (thinking mode, rich context, streaming, portfolio awareness, backtest)
- Phase 6.1 inserted after Phase 6: Analytics Data Quality & Depth — fix correctness bugs + deeper metrics (URGENT)
- Phase 6.2 inserted after Phase 6.1: Realtime Prices & Anton UX Fixes — gRPC streaming prices, UX fixes from Anton doc (URGENT)
- Phase 7.1 inserted after Phase 7: Analytics Polish & Data Integrity — fix statistical validity, RF rate, data warnings (URGENT)
- Phase 9 added: Data Pipeline Overhaul — replace technicalindicators→trading-signals, integrate backtest-kit, MOEX candle normalization, Redis caching, terminal price bar fix, TradingView accuracy audit
- Phase 10 added: Security & Code Quality Hardening — auth bypasses, rate limiting, IDOR, prompt injection, input validation, file splitting (from comprehensive audit)
- Phase 11 added: Root Cause Bug Fixes — AI wizard strategy creation, period-based %, real amounts in portfolio, Telegram details, strategy auto-stop, operation volume, position mismatch (Anton feedback 2026-03-28)
- Phase 14.2 inserted after Phase 14: MOEX Evening Session + Chart Correctness — терминал не показывает вечернюю сессию (18:40-23:50), root cause всех расхождений с T-Invest (URGENT BLOCKER)
- Phase 15.1 inserted after Phase 15: Grid Trading Integration — Grid как тип стратегии (не отдельная панель), ready-made решения, фикс critical P&L баг, полный аудит (URGENT)

### Pending Todos

- Confirm cohort primary dimension with Anton before Phase 6 starts (holding period vs sector)
- Verify live MOEX ISS sector endpoint behavior before Phase 6 (may need static fallback only)
- Anton feedback s34: verify duplicate notifications fix on prod
- TGLD @ ticker: may need DB cleanup for existing strategies with @ suffix

### Blockers/Concerns

- Phase 6: MOEX ISS sector API endpoint is MEDIUM confidence — validate during planning or use static map
- Phase 4: DeepSeek context reset after strategy creation defers multi-turn refinement — clarify with Anton if needed

## Session Continuity

Last session: 2026-03-29T09:15:18.465Z
Stopped at: Completed 15-grid-trading-04-PLAN.md (checkpoint: awaiting human-verify)
Resume file: None
Next: /gsd:plan-phase 6.2
