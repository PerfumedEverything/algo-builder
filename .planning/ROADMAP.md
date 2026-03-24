# Roadmap: AculaTrade Portfolio Analytics & Terminal

## Overview

This milestone extends AculaTrade with professional portfolio analytics and a built-in chart terminal. The work progresses from data infrastructure and visual impact (MOEX provider, candlestick charts, skeleton loading) through analytical layers of increasing complexity: risk metrics, fundamentals, diversification analysis, and finally Markowitz portfolio optimization. Each phase delivers a complete, usable capability. MOEXProvider is the critical-path dependency that unlocks benchmark data for all subsequent analytics phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure & Terminal** - MOEX provider, candlestick charts, terminal page, deposit tracker, skeleton loading, ticker bug fix, AI analysis button
- [x] **Phase 2: Risk Metrics** - Sharpe, Beta, VaR, Max Drawdown, Alpha with color-coded cards and AI analysis
- [x] **Phase 2.1: Terminal v2** - INSERTED — TradingView widget, order book, realtime prices, positions panel, trade history, top movers (completed 2026-03-24)
- [ ] **Phase 3: Fundamentals** - P/E, P/B, dividend yield scoring per position with AI fundamental analysis
- [ ] **Phase 4: Diversification Analysis** - Correlation heatmap, sector/type/performance cohort charts, AI diversification analysis
- [ ] **Phase 5: Portfolio Optimization** - Markowitz optimal weights, rebalancing recommendations, full portfolio AI analysis

## Phase Details

### Phase 1: Infrastructure & Terminal
**Goal**: Users can view candlestick charts on a dedicated Terminal page, see deposit-adjusted P&L, and experience smooth loading across all dashboard pages
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02a, INFR-03, INFR-04, INFR-05, INFR-06, CHRT-01, CHRT-02, CHRT-03, CHRT-04, CHRT-05, CHRT-06, CHRT-07, AIAN-01, AIAN-02
**Note**: INFR-02b (P/E, P/B ratios) deferred to Phase 3 — MOEX ISS does not provide these; alternative source needed
**Success Criteria** (what must be TRUE):
  1. User can open /terminal, search for a ticker, and see a candlestick chart with period switching (1d/1w/1m/3m/1y)
  2. User sees trade entry/exit markers overlaid on the chart for instruments they have traded
  3. User can click an AI analysis button on the chart and receive a streaming technical analysis response
  4. User sees deposit-adjusted real P&L on the portfolio page (deposits/withdrawals tracked separately)
  5. All dashboard pages show skeleton loading states instead of blank screens during data fetch
**Plans:** 5 plans
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
**Plans:** 3 plans
Plans:
- [x] 02-01-PLAN.md — Risk types, pure math calculations (TDD), RiskService orchestration
- [x] 02-02-PLAN.md — Server action with Redis cache, risk metric cards UI, portfolio page integration
- [x] 02-03-PLAN.md — AI risk analysis button integration
**UI hint**: yes

### Phase 2.1: Terminal v2 (INSERTED)
**Goal**: Users have a professional trading terminal with TradingView charts, order book, realtime prices, open positions, and trade history
**Depends on**: Phase 1 (existing terminal page, MOEX provider, price-stream-worker)
**Requirements**: TERM-01, TERM-02, TERM-03, TERM-04, TERM-05, TERM-06
**Success Criteria** (what must be TRUE):
  1. User sees TradingView Advanced Chart widget with full indicator/drawing tool set for MOEX instruments
  2. User sees realtime price bar (ticker, price, change %, H/L, volume, bid/ask) updating live
  3. User sees order book (стакан) with bid/ask depth and spread next to the chart
  4. User sees their open positions with realtime P&L below the chart
  5. User sees trade history for the selected instrument
  6. User sees top gainers and top losers across all MOEX instruments for the day
**Plans:** 2/2 plans complete
Plans:
- [x] 02.1-01-PLAN.md — Data layer: SSE price stream, order book action, top movers action, terminal types
- [x] 02.1-02-PLAN.md — Terminal page UI: TradingView widget, price bar, order book, positions, trade history, top movers
**UI hint**: yes

### Phase 3: Fundamentals
**Goal**: Users can evaluate the fundamental value of each position in their portfolio with a composite score
**Depends on**: Phase 1 (MOEXProvider for MOEX ISS fundamentals data)
**Requirements**: INFR-02b, FUND-01, FUND-02, FUND-03, FUND-04, FUND-05
**Success Criteria** (what must be TRUE):
  1. User can expand any portfolio position and see P/E, P/B, dividend yield with color-coded cheap/normal/expensive indicators
  2. User sees a composite fundamental score (1-10) for each position
  3. User can click the AI fundamental analysis button and receive a streaming evaluation of the position multiples and price
**Plans**: TBD
**UI hint**: yes

### Phase 4: Diversification Analysis
**Goal**: Users can visualize portfolio diversification quality through correlation and cohort breakdowns
**Depends on**: Phase 1 (candle data infrastructure), Phase 2 (daily returns pipeline)
**Requirements**: CORR-01, CORR-02, CORR-03, CORR-04, COHT-01, COHT-02, COHT-03, COHT-04
**Success Criteria** (what must be TRUE):
  1. User sees a correlation heatmap showing how their positions move relative to each other, with high-correlation pairs (>0.7) visually flagged
  2. User sees cohort breakdowns of their portfolio by asset type, sector, and trade success as pie/donut charts
  3. Correlation and cohort data loads from server-side cache without long wait times
**Plans**: TBD
**UI hint**: yes

### Phase 5: Portfolio Optimization
**Goal**: Users receive actionable rebalancing recommendations based on Markowitz optimization
**Depends on**: Phase 4 (covariance matrix), Phase 2 (risk metrics for Sharpe target)
**Requirements**: OPTM-01, OPTM-02, OPTM-03, OPTM-04, OPTM-05, OPTM-06, AIAN-03
**Success Criteria** (what must be TRUE):
  1. User sees current vs optimal portfolio weight comparison as two side-by-side donut charts
  2. User sees concrete rebalancing actions ("Sell X lots of TICKER, buy Y lots of TICKER") that account for lot sizes and broker commission
  3. User can click the full portfolio AI analysis button and receive a comprehensive streaming analysis covering risk, fundamentals, correlations, and optimization together
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 2.1 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Terminal | 5/5 | Complete | 2026-03-23 |
| 2. Risk Metrics | 3/3 | Complete | 2026-03-24 |
| 2.1 Terminal v2 (INSERTED) | 2/2 | Complete   | 2026-03-24 |
| 3. Fundamentals | 0/TBD | Not started | - |
| 4. Diversification Analysis | 0/TBD | Not started | - |
| 5. Portfolio Optimization | 0/TBD | Not started | - |

## Backlog

### Phase 999.1: AI Analysis Flow (BACKLOG)
**Goal:** After AI technical analysis in Terminal -- actionable flow: create signal from recommendation, create strategy from analysis, add to watchlist. UX: action buttons in analysis dialog, mapping AI recommendations to signal/strategy parameters.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
