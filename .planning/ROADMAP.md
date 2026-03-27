# Roadmap: AculaTrade Portfolio Analytics & Terminal

## Milestones

- ✅ **v1.0 Portfolio Analytics & Terminal** - Phases 1-3.1 (shipped 2026-03-25)
- 🚧 **v1.1 AI Revolution + Deep Analytics** - Phases 4-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Portfolio Analytics & Terminal (Phases 1-3.1) - SHIPPED 2026-03-25</summary>

### Phase 1: Infrastructure & Terminal
**Goal**: Users can view candlestick charts on a dedicated Terminal page, see deposit-adjusted P&L, and experience smooth loading across all dashboard pages
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02a, INFR-03, INFR-04, INFR-05, INFR-06, CHRT-01, CHRT-02, CHRT-03, CHRT-04, CHRT-05, CHRT-06, CHRT-07, AIAN-01, AIAN-02
**Success Criteria** (what must be TRUE):
  1. User can open /terminal, search for a ticker, and see a candlestick chart with period switching (1d/1w/1m/3m/1y)
  2. User sees trade entry/exit markers overlaid on the chart for instruments they have traded
  3. User can click an AI analysis button on the chart and receive a streaming technical analysis response
  4. User sees deposit-adjusted real P&L on the portfolio page (deposits/withdrawals tracked separately)
  5. All dashboard pages show skeleton loading states instead of blank screens during data fetch
**Plans:** 5/5 plans complete
Plans:
- [x] 01-01-PLAN.md — MOEX ISS provider with Redis cache + ticker bug fix
- [x] 01-02-PLAN.md — Skeleton loading states + deposit tracker
- [x] 01-03-PLAN.md — Reusable AI analysis button + system prompts config
- [x] 01-04-PLAN.md — Candlestick chart component + period selector + server actions
- [x] 01-05-PLAN.md — Terminal page + sidebar navigation + visual verification
**UI hint**: yes

### Phase 2: Risk Metrics
**Goal**: Users can assess their portfolio risk through professional metrics with clear good/neutral/bad indicators
**Depends on**: Phase 1 (MOEXProvider for IMOEX benchmark data)
**Requirements**: RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06, RISK-07, RISK-08, RISK-09
**Success Criteria** (what must be TRUE):
  1. User sees 5 risk metric cards (Sharpe, Beta, VaR, Max Drawdown, Alpha) on the portfolio page with color coding (green/yellow/red)
  2. User can hover over any metric card and see a tooltip explaining what the metric means and how to interpret it
  3. User can click the AI risk analysis button and receive a streaming evaluation of all 5 metrics in context of their positions
**Plans:** 3/3 plans complete
Plans:
- [x] 02-01-PLAN.md — Risk types, pure math calculations (TDD), RiskService orchestration
- [x] 02-02-PLAN.md — Server action with Redis cache, risk metric cards UI, portfolio page integration
- [x] 02-03-PLAN.md — AI risk analysis button integration
**UI hint**: yes

### Phase 2.1: Terminal v2 (INSERTED — REPLANNED)
**Goal**: Users have a professional trading terminal with lightweight-charts candlestick chart, order book, realtime prices, open positions with P&L, and trade history
**Depends on**: Phase 1 (existing terminal page, MOEX provider, price-stream-worker)
**Requirements**: TERM-01, TERM-02, TERM-03, TERM-04, TERM-05, TERM-06
**Success Criteria** (what must be TRUE):
  1. User sees lightweight-charts candlestick chart with period switching and trade markers
  2. User sees realtime price bar (ticker, price, change %, H/L, volume, bid/ask) updating live via SSE
  3. User sees order book (стакан) with bid/ask depth and spread next to the chart
  4. User sees their open positions with realtime P&L below the chart
  5. User sees trade history for the selected instrument
**Plans:** 2/2 plans complete
Plans:
- [x] 02.1-01-PLAN.md — Terminal utilities with tests, PriceBar and OrderBook components
- [x] 02.1-02-PLAN.md — PositionsPanel, TradeHistoryPanel, terminal page assembly per wireframe
**UI hint**: yes

### Phase 2.2: Strategy Pipeline Fix (INSERTED CRITICAL)
**Goal**: All 16 bugs in strategy/signal checker pipeline are fixed so automated strategies work reliably with any condition type
**Depends on**: Phase 1 (MOEX provider, candle infrastructure)
**Requirements**: STFIX-01, STFIX-02, STFIX-03, STFIX-04, STFIX-05, STFIX-06, STFIX-07, STFIX-08, STFIX-09, STFIX-10
**Success Criteria** (what must be TRUE):
  1. CROSSES_ABOVE/CROSSES_BELOW triggers only on actual value crossing (not simple comparison)
  2. All indicators return null (not 0) when insufficient candle data — callers skip evaluation
  3. Race conditions in signal triggerCount and strategy positionState are eliminated via atomic operations
  4. Operation recording failures roll back state changes
  5. Redis-based dedup lock prevents concurrent cron+realtime double-checks
  6. Unit tests cover every fixed bug scenario
**Plans:** 3/3 plans complete
Plans:
- [x] 02.2-01-PLAN.md — IndicatorCalculator null-safety + DB migrations
- [x] 02.2-02-PLAN.md — Strategy checker fixes (CROSSES, atomic guard, rollback, Redis lock)
- [x] 02.2-03-PLAN.md — Signal checker fixes (CROSSES, null-safety, Redis lock)
**UI hint**: no

### Phase 2.3: Strategy & Portfolio Hardening (INSERTED)
**Goal**: Fix paper portfolio data reliability, ticker @ cleanup, price freshness validation, and harden all strategy/signal flows for production stability
**Depends on**: Phase 2.2 (strategy pipeline fixes)
**Requirements**: HARD-01, HARD-02, HARD-03, HARD-04, HARD-05, HARD-06, HARD-07, HARD-08, HARD-09, HARD-10, HARD-11, HARD-12, HARD-13, HARD-14, HARD-15
**Success Criteria** (what must be TRUE):
  1. Paper portfolio always shows all active strategies with their P&L (no silently skipped rows)
  2. All tickers in DB are clean (no @ suffix) — strategies and signals
  3. Strategies always use fresh prices (not stale cache)
  4. Strategy card displays correct data after phase 2.2 fixes
  5. Error handling is resilient — one strategy failure doesn't break the whole view
**Plans:** 4/4 plans complete
Plans:
- [x] 02.3-01-PLAN.md — Price cache hardening: remove stale fallback, reduce TTL, increase lock TTL
- [x] 02.3-02-PLAN.md — Checker hardening: cleanTicker, signal checkAll lock, persist try/catch
- [x] 02.3-03-PLAN.md — Paper portfolio resilience, trigger handler CRITICAL logging, strategy card error toast
- [x] 02.3-04-PLAN.md — SQL ticker migration script, paper-portfolio-view useCallback fix
**UI hint**: no

### Phase 3: MVP Polish + Fundamentals
**Goal**: Product feels polished and professional — strategy cards are clear, terminal links to strategies, AI chat replaces quiz, UI consistent + users see fundamental metrics per position
**Depends on**: Phase 2.3 (hardened strategy pipeline), Phase 1 (MOEXProvider)
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07, POL-08, POL-09, POL-10, INFR-02b, FUND-01, FUND-02, FUND-03, FUND-04, FUND-05
**Success Criteria** (what must be TRUE):
  1. Strategy card: closed position shows P&L result only (not sum of buys); all labels are clear with tooltips
  2. Terminal has "Create Strategy" and "Create Signal" buttons for current instrument
  3. AI strategy creation uses free-form chat mode instead of rigid quiz
  4. Portfolio page shows summary block: total value, debit/credit, % growth/decline
  5. All AI buttons blue, signals no @ suffix, terminal 2nd in sidebar, timeframes correct, mobile works
  6. User can expand any portfolio position and see P/E, P/B, dividend yield with color-coded indicators
  7. User sees composite fundamental score (1-10) and can click AI fundamental analysis button
**Plans:** 5/5 plans complete
Plans:
- [x] 03-01-PLAN.md — Strategy card P&L fix + tooltips + clear labels
- [x] 03-02-PLAN.md — Terminal action buttons + signal cleanTicker + mobile polish
- [x] 03-03-PLAN.md — AI chat mode + portfolio summary + blue AI buttons
- [x] 03-04-PLAN.md — Fundamentals data layer (static map + service + scoring)
- [x] 03-05-PLAN.md — Fundamental UI card + portfolio integration + AI analysis
**UI hint**: yes

### Phase 3.1: UX Audit (INSERTED)
**Goal**: Playwright walks through every page and user flow as a real user — documents all UX problems: confusing navigation, overloaded screens, unclear labels, dead ends, broken flows, mobile issues
**Depends on**: Phase 3 (after polish fixes are applied)
**Requirements**: UXA-01, UXA-02, UXA-03, UXA-04, UXA-05
**Success Criteria** (what must be TRUE):
  1. Every dashboard page screenshotted in desktop + mobile viewport
  2. All critical user flows tested end-to-end (create strategy, create signal, view portfolio, use terminal, AI analysis)
  3. UX issues documented with screenshots, severity, and fix recommendation
  4. Issues triaged into "fix now" (Phase 3.1) vs "backlog"
  5. All "fix now" issues resolved before moving to Phase 4
**Plans**: 2 plans
Plans:
- [x] 06.2-01-PLAN.md — Worker dynamic subscription + price precision + shared class codes
- [x] 06.2-02-PLAN.md — Paper portfolio date filter + terminal UX fixes (hide empty, mobile AI, TopMovers links)
**UI hint**: yes

</details>

### v1.1 AI Revolution + Deep Analytics (In Progress)

**Milestone Goal:** AI-помощник в формате свободного размышления, глубокая аналитика терминала и портфеля лучше Т-Инвест.

## Phase Details (v1.1)

### Phase 4: AI Revolution
**Goal**: Users can create strategies through free-form conversation — AI reasons with the user, auto-fills strategy parameters from dialog context, and enables direct strategy/signal creation from terminal analysis
**Depends on**: Phase 3 (existing AI chat, terminal analysis buttons, strategy builder)
**Requirements**: AIREV-01, AIREV-02, AIREV-03, AIREV-04, AIREV-05, AIREV-06
**Success Criteria** (what must be TRUE):
  1. User can start a free-form conversation describing their trading idea and AI proposes a complete strategy config without requiring a quiz
  2. User sees a live strategy preview panel updating in real time as AI extracts parameters from the conversation
  3. After AI completes technical analysis in terminal, user can click "Create Strategy" and land in AI chat pre-seeded with analysis context
  4. After AI technical analysis, user can click "Create Signal" and have AI suggest matching signal conditions
  5. User can use ATR, Stochastic, VWAP, and Williams %R indicators when building strategy conditions
  6. User can set BETWEEN range conditions and percent-based threshold conditions in the strategy builder
**Plans:** 3/3 plans complete
Plans:
- [x] 04-01-PLAN.md — New indicators (ATR, Stochastic, VWAP, Williams %R) + BETWEEN condition backend
- [x] 04-02-PLAN.md — Free-form AI chat + live strategy preview panel + DeepSeek provider update
- [x] 04-03-PLAN.md — Terminal context seeding + BETWEEN UI + visual verification
**UI hint**: yes
**Note**: UX polish deferred to Phase 4.1 (wizard flow, timeframe fix, redo analysis, mobile overflow)

### Phase 4.1: AI UX Polish (INSERTED)
**Goal**: Polish the AI Revolution UX — wizard flow for analysis→strategy, fix timeframe bug, enable redo analysis, fix mobile overflow
**Depends on**: Phase 4 (core AI features implemented)
**Requirements**: AIUX-01, AIUX-02, AIUX-03, AIUX-04, AIUX-05
**Success Criteria** (what must be TRUE):
  1. User experiences a 3-step wizard flow: Анализ → Стратегия (AI chat + preview) → Настройка (form) in a single dialog
  2. AI analysis uses the currently selected chart timeframe (not hardcoded 1d)
  3. User can rerun/redo AI analysis from within the analysis dialog
  4. Action buttons in analysis dialog do not overflow on mobile viewports
  5. Transition from analysis result to strategy creation feels seamless (not bolted-on)
**Plans:** 2/2 plans complete
Plans:
- [x] 04.1-01-PLAN.md — AiWizardDialog + WizardStepIndicator components (3-step wizard)
- [x] 04.1-02-PLAN.md — Wire wizard into terminal page + AI context fix + visual verification
**UI hint**: yes

### Phase 5: Terminal Top Movers
**Goal**: Users see the biggest daily gainers and losers in the terminal and can navigate to any of them with one click
**Depends on**: Phase 4 (independent — backend getTopMovers() already complete)
**Requirements**: TERM-01, TERM-02, TERM-03
**Success Criteria** (what must be TRUE):
  1. User sees a "Top Gainers" panel with the top 5 instruments sorted by daily % change (positive), refreshing every 60 seconds
  2. User sees a "Top Losers" panel with the top 5 instruments sorted by daily % change (negative), refreshing every 60 seconds
  3. User can click any instrument in either panel and the terminal chart immediately loads that instrument
  4. Outside market hours (09:50-18:50 MSK Mon-Fri), panels show a "Биржа закрыта" badge and label data as last session
**Plans:** 1/1 plans complete
Plans:
- [x] 05-01-PLAN.md — TopMoversPanel component + market hours utility + terminal page integration
**UI hint**: yes

### Phase 5.1: Data Consistency & UX Fixes (INSERTED)
**Goal**: Fix P&L mismatch, TopMovers navigation, portfolio table info, duplicate notifications, and algovist ticker consistency
**Depends on**: Phase 5 (TopMovers panel)
**Requirements**: DFIX-01, DFIX-02, DFIX-03, DFIX-04
**Success Criteria** (what must be TRUE):
  1. Paper portfolio P&L matches strategy page P&L for the same strategy (same price source)
  2. Clicking any TopMover navigates to that instrument's chart immediately
  3. Paper portfolio table shows strategy name, instrument, and operations breakdown (profitable/unprofitable)
  4. All instruments use algovist ticker variant — prices match T-Invest app exactly
**Plans:** 2/2 plans
Plans:
- [x] 05.1-01-PLAN.md — Fix P&L, TopMovers click, portfolio table
- [x] 05.1-02-PLAN.md — Fix duplicate notifications + algovist ticker
**UI hint**: yes

### Phase 6: Portfolio Analytics — Correlations, Sector & Cohorts
**Goal**: Users can understand portfolio diversification quality through correlation heatmap, sector allocation chart, and cohort breakdowns by asset type and trade success
**Depends on**: Phase 4 (candle data infrastructure from Phase 1/2 already in place)
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05
**Success Criteria** (what must be TRUE):
  1. User sees a correlation heatmap of all their portfolio positions showing how each pair moves relative to each other
  2. High-correlation pairs (Pearson > 0.7) are visually flagged on the heatmap with a distinct color or border
  3. User sees a sector allocation donut chart showing what percentage of portfolio value is in each MOEX sector
  4. User sees a cohort breakdown by asset type (stocks, bonds, ETF, currency) as a chart
  5. User sees a cohort breakdown by trade success showing profitable vs unprofitable positions by count and value
**Plans:** 2/2 plans complete
Plans:
- [x] 06-01-PLAN.md — Analytics service + server actions (correlation, sector, cohorts)
- [x] 06-02-PLAN.md — UI components (heatmap, donut, charts) + portfolio page integration
**UI hint**: yes

### Phase 6.1: Analytics Data Quality & Depth (INSERTED)
**Goal**: Fix data correctness issues in Phase 6 analytics (asset type mapping, break-even trades, N+1 queries), add portfolio concentration metrics (Herfindahl index), IMOEX benchmark comparison, dividend yield aggregation, instrument-level P&L breakdown, and configurable correlation period — making analytics deeper and more accurate than T-Invest
**Depends on**: Phase 6 (analytics service and UI components)
**Requirements**: AQFIX-01, AQFIX-02, AQFIX-03, AQFIX-04, AQFIX-05, AQFIX-06, AQFIX-07, AQFIX-08
**Success Criteria** (what must be TRUE):
  1. Asset type chart correctly maps STOCK/ETF/BOND/CURRENCY/FUTURES types to Russian labels and colors (no case mismatch)
  2. Break-even strategies (pnl === 0) are counted separately in trade success breakdown, not silently dropped
  3. Trade success breakdown uses batch query instead of N+1 per-strategy queries
  4. Portfolio page shows Herfindahl concentration index with warning when single position exceeds 40% of portfolio value
  5. Portfolio page shows portfolio return vs IMOEX benchmark return for matching period (30/90/180 days)
  6. Portfolio page shows aggregate dividend yield based on position weights and FUNDAMENTALS_MAP data
  7. Trade success section shows P&L breakdown by individual instrument (not just strategy-level)
  8. User can switch correlation period between 30/60/90/180 days
**Plans:** 1/2 plans executed
Plans:
- [x] 06.1-01-PLAN.md — Fix bugs (asset type, break-even, N+1) + add service methods (HHI, IMOEX, dividends, instrument P&L, correlation period)
- [x] 06.1-02-PLAN.md — Server actions + UI components (cards, table, period selector) + portfolio page integration
**UI hint**: yes

### Phase 6.2: Realtime Prices & Anton UX Fixes (INSERTED)
**Goal**: Real-time price streaming via Tinkoff MarketDataStream gRPC, accurate prices matching T-Invest across all components, plus UX fixes from Anton's feedback: date filters in test portfolio, hide empty terminal blocks, TopMovers as clickable links, mobile AI button, show actual purchase amounts
**Depends on**: Phase 6.1 (analytics complete, price system needs overhaul)
**Requirements**: RTPRICE-01, RTPRICE-02, RTPRICE-03, RTPRICE-04, RTPRICE-05, RTPRICE-06, RTPRICE-07, RTPRICE-08
**Success Criteria** (what must be TRUE):
  1. Terminal price updates in real-time (< 1s delay) matching T-Invest to the kopeck via Tinkoff MarketDataStream
  2. All price displays across the app (terminal, portfolio, strategies, signals) use the same real-time price source
  3. Test portfolio has date filter (Все время/сегодня/вчера/7 дней/30 дней/произвольная дата)
  4. Terminal hides empty "Открытые позиции" and "История сделок" blocks when no data
  5. TopMovers tickers are clickable links that navigate to the instrument chart
  6. Mobile AI button has full label text
  7. Test portfolio shows actual purchase amounts (not strategy settings amounts)
  8. All tickers are consistently uppercase across the entire system
**Plans**: 2 plans
Plans:
- [x] 06.2-01-PLAN.md — Worker dynamic subscription + price precision + shared class codes
- [x] 06.2-02-PLAN.md — Paper portfolio date filter + terminal UX fixes (hide empty, mobile AI, TopMovers links)
**UI hint**: yes

### Phase 7: Portfolio Optimization + Full AI Analysis
**Goal**: Users receive Markowitz-based rebalancing recommendations and a comprehensive AI analysis of their entire portfolio
**Depends on**: Phase 6 (covariance matrix and sector data from analytics service)
**Requirements**: PORT-06, PORT-07, PORT-08
**Success Criteria** (what must be TRUE):
  1. User sees current vs Markowitz-optimal portfolio weights as a side-by-side comparison (current donut vs optimal donut)
  2. User sees a concrete rebalancing action list ("Sell X lots of TICKER, buy Y lots of TICKER") derived from the weight delta
  3. User can click "Full AI Portfolio Analysis" and receive a comprehensive streaming analysis covering risk metrics, fundamentals, correlations, and optimization together
**Plans:** 2 plans
Plans:
- [x] 07-01-PLAN.md — Markowitz types + Monte Carlo optimizer + rebalancing lot math + tests
- [x] 07-02-PLAN.md — Server actions + AI prompt + UI components (donuts, rebalancing table) + portfolio page wiring
**UI hint**: yes

### Phase 7.1: Analytics Polish & Data Integrity (INSERTED)
**Goal**: Replace academic analytics with actionable trader tools — Portfolio Health Score (1-100), honest benchmark comparison ("обгоняете рынок" / "депозит выгоднее"), simple diversification recommendations instead of Markowitz, human-readable correlation warnings, dividend calendar with projected income, partial error handling, complete AI analysis data
**Depends on**: Phase 7 (analytics features exist but produce unreliable/meaningless data)
**Requirements**: APOL-01, APOL-02, APOL-03, APOL-04, APOL-05, APOL-06, APOL-07
**Success Criteria** (what must be TRUE):
  1. Portfolio Health Score card (1-100) with color-coded breakdown: diversification, risk, performance — with plain-language explanations (not "Sharpe 0.74")
  2. Markowitz donuts REPLACED with simple diversification advice: "⚠️ SBER 45% — снизьте до 25%", "💡 Нет IT-сектора", "✅ Хорошая диверсификация"
  3. Benchmark section shows "Вы обгоняете рынок на X%" or "Депозит выгоднее на X%" with clear labels (price return, without dividends)
  4. Correlation warnings in human language: "SBER и VTBR движутся вместе (оба банки)" instead of raw matrix numbers
  5. Risk-free rate = 15% (CBR key rate), all analytics use per-metric try/catch (one failure doesn't break all)
  6. AI portfolio analysis receives ALL positions, health score, specific problems — no truncation, no phantom metrics
  7. Unit tests cover health score calculation, diversification rules, benchmark comparison
**Plans**: 2 plans
Plans:
- [x] 07.1-01-PLAN.md — Types + constants + PortfolioHealthService + unit tests
- [x] 07.1-02-PLAN.md — Server actions + AI prompt + UI components + portfolio page rewire
**UI hint**: yes

### Phase 8: AI Assistant Deep Upgrade
**Goal**: Transform AI assistant from basic prompt-response into intelligent trading advisor with thinking mode, rich context, streaming, and portfolio awareness
**Depends on**: Phase 4.1 (wizard flow), Phase 6 (portfolio analytics for correlation data)
**Requirements**: AIUP-01, AIUP-02, AIUP-03, AIUP-04, AIUP-05, AIUP-06, AIUP-07, AIUP-08, AIUP-09
**Success Criteria** (what must be TRUE):
  1. AI uses thinking/reasoning step before responding — produces deeper, more contextual analysis
  2. AI receives volume, order book data, and current positions alongside OHLC candles
  3. AI can analyze senior timeframe for multi-timeframe confirmation
  4. After AI proposes strategies, user sees quick action buttons ("Create this", "Show others", "Change risks")
  5. AI responses stream character by character (not wait for full response)
  6. AI sees current portfolio positions and warns about concentration/correlation risks
  7. AI has access to fundamental data (P/E, dividends) when discussing instruments
  8. After strategy creation, user sees a backtest preview on historical data
  9. User can continue conversation after strategy creation ("now make one for GAZP")
**Plans**: 2 plans
Plans:
- [x] 06.2-01-PLAN.md — Worker dynamic subscription + price precision + shared class codes
- [ ] 06.2-02-PLAN.md — Paper portfolio date filter + terminal UX fixes (hide empty, mobile AI, TopMovers links)
**UI hint**: yes

### Phase 9: Data Pipeline Overhaul
**Goal**: Replace abandoned indicator library with verified alternative, integrate backtesting engine, normalize MOEX candle data, fix terminal price bar, add candle caching — making all market data across the platform accurate and verifiable against TradingView
**Depends on**: Phase 7.1 (analytics complete, data layer needs fundamental overhaul)
**Requirements**: DPIPE-01, DPIPE-02, DPIPE-03, DPIPE-04, DPIPE-05, DPIPE-06, DPIPE-07, DPIPE-08
**Success Criteria** (what must be TRUE):
  1. `technicalindicators` replaced with `trading-signals` — all indicators (RSI, SMA, EMA, MACD, Bollinger, ATR, Stochastic, VWAP, Williams %R) produce values matching TradingView within 0.1% tolerance
  2. `backtest-kit` integrated — strategies can be backtested on historical MOEX data with configurable slippage and fees
  3. MOEX candle normalization utility handles timezone (UTC→MSK), session boundaries (main 10:00-18:40, evening 19:05-23:50), weekend/holiday filtering
  4. Terminal price bar shows daily session values: percent change from MOEX session open, daily H/L, daily volume (not per-candle values)
  5. Historical candles cached in Redis with incremental updates — no redundant API calls for same data
  6. Indicator calculations use 500+ candle warmup period for accuracy
  7. Comprehensive test suite: indicator output vs TradingView reference values, candle normalization edge cases, cache hit/miss scenarios
  8. Audit report documenting before/after comparison of indicator values against TradingView for top 10 instruments
**Plans**: 5 plans
Plans:
- [x] 09-01-PLAN.md — Indicator migration: technicalindicators → trading-signals + 500+ warmup
- [x] 09-02-PLAN.md — MOEX candle normalizer + Redis cache incremental append + warmup TTLs
- [ ] 09-03-PLAN.md — Terminal price bar fix: daily session stats instead of lastCandle
- [ ] 09-04-PLAN.md — backtest-kit integration as BacktestService with MOEX exchange schema
- [ ] 09-05-PLAN.md — Indicator accuracy test suite + audit report script
**UI hint**: yes
## Progress

**Execution Order:**
v1.0: 1 → 2 → 2.1 → 2.2 → 2.3 → 3 → 3.1 (archived)
v1.1: 4 → 4.1 → 5 → 5.1 → 6 → 6.1 → 6.2 → 7 → 7.1 → 9 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infrastructure & Terminal | v1.0 | 5/5 | Complete | 2026-03-23 |
| 2. Risk Metrics | v1.0 | 3/3 | Complete | 2026-03-24 |
| 2.1 Terminal v2 (INSERTED) | v1.0 | 2/2 | Complete | 2026-03-24 |
| 2.2 Strategy Pipeline Fix (CRITICAL) | v1.0 | 3/3 | Complete | 2026-03-25 |
| 2.3 Strategy & Portfolio Hardening | v1.0 | 4/4 | Complete | 2026-03-25 |
| 3. MVP Polish + Fundamentals | v1.0 | 5/5 | Complete | 2026-03-25 |
| 3.1 UX Audit (INSERTED) | v1.0 | 0/TBD | Complete | 2026-03-25 |
| 4. AI Revolution | v1.1 | 3/3 | Complete | 2026-03-25 |
| 4.1 AI UX Polish (INSERTED) | v1.1 | 2/2 | Complete | 2026-03-26 |
| 5. Terminal Top Movers | v1.1 | 1/1 | Complete   | 2026-03-26 |
| 5.1 Data Consistency & UX Fixes (INSERTED) | v1.1 | 2/2 | Complete | 2026-03-26 |
| 6. Portfolio Analytics — Correlations, Sector & Cohorts | v1.1 | 2/2 | Complete   | 2026-03-26 |
| 6.1 Analytics Data Quality & Depth (INSERTED) | v1.1 | 2/2 | Complete | 2026-03-26 |
| 6.2 Realtime Prices & Anton UX Fixes (INSERTED) | v1.1 | 0/2 | Not started | - |
| 7. Portfolio Optimization + Full AI Analysis | v1.1 | 2/2 | Complete | 2026-03-26 |
| 7.1 Analytics Polish & Data Integrity (INSERTED) | v1.1 | 0/2 | Not started | - |
| 8. AI Assistant Deep Upgrade | v1.1 | 0/TBD | Not started | - |
| 9. Data Pipeline Overhaul | v1.1 | 2/5 | In Progress|  |

