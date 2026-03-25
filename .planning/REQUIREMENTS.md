# Requirements: AculaTrade Portfolio Analytics & Terminal

**Defined:** 2026-03-23
**Core Value:** Professional portfolio analytics (risk, fundamentals, correlations, optimization) + built-in chart terminal — all in unified platform style

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFR-01**: MOEX ISS provider fetches IMOEX benchmark candles with Redis cache (24h TTL)
- [x] **INFR-02a**: MOEX ISS provider fetches dividend history per ticker with Redis cache (7d TTL)
- [x] **INFR-02b**: Security fundamentals P/E, P/B ratios (deferred to Phase 3 — MOEX ISS does not provide these; alternative source needed)
- [x] **INFR-03**: MOEX ISS provider handles pagination (100-row limit) automatically
- [x] **INFR-04**: Deposit tracker shows total deposits/withdrawals and deposit-adjusted real P&L
- [x] **INFR-05**: Skeleton loading on all dashboard pages (dashboard, strategies, signals, portfolio, settings, admin, terminal)
- [x] **INFR-06**: Ticker display bug fixed — no @ suffix, correct case in strategies

### Charts & Terminal

- [x] **CHRT-01**: Candlestick chart renders T-Invest OHLCV data via lightweight-charts (dark theme, CSS vars)
- [x] **CHRT-02**: Period selector switches between 1d/1w/1m/3m/1y timeframes
- [x] **CHRT-03**: Trade markers overlay on chart (entry/exit points from operations)
- [ ] **CHRT-04**: Terminal page at /terminal with ticker search (InstrumentSelect reuse)
- [ ] **CHRT-05**: Terminal page accessible from sidebar navigation
- [ ] **CHRT-06**: AI technical analysis button on chart — DeepSeek analyzes OHLCV as professional trader
- [x] **CHRT-07**: Chart component reusable in portfolio position expand and terminal page

### Risk Metrics

- [ ] **RISK-01**: BenchmarkService provides IMOEX daily returns from MOEX ISS with Redis cache
- [ ] **RISK-02**: Sharpe Ratio calculated with CBR key rate as risk-free rate (~21%/248 trading days)
- [ ] **RISK-03**: Max Drawdown calculated with peak date, trough date, and percentage
- [ ] **RISK-04**: VaR calculated at 95% confidence using historical simulation
- [ ] **RISK-05**: Beta calculated against IMOEX benchmark
- [ ] **RISK-06**: Alpha (Jensen's) calculated from portfolio return, beta, benchmark return
- [ ] **RISK-07**: Risk metrics displayed as 5 cards with color coding (green/yellow/red thresholds)
- [ ] **RISK-08**: Each metric card has tooltip explaining what it means
- [ ] **RISK-09**: AI risk analysis button — DeepSeek evaluates all 5 metrics + positions

### MVP Polish

- [ ] **POL-01**: Portfolio summary block — total portfolio value, debit/credit amounts, % growth/decline
- [ ] **POL-02**: AI analysis buttons → blue background for visual consistency across all pages
- [x] **POL-03**: Signal actions apply cleanTicker — no @ suffix in saved signals
- [x] **POL-04**: Terminal tab → second position in sidebar menu (after Dashboard)
- [x] **POL-05**: Chart timeframes fix — 1D shows daily candles over weeks/months, not 1 day of data
- [x] **POL-06**: Terminal mobile responsiveness — timeframe selector, AI button fit on small screens, chart full width
- [ ] **POL-07**: Strategy card: closed position shows only P&L result (not sum of all buys as "portfolio size")
- [ ] **POL-08**: Strategy card UX — clear labels, tooltips, readable condition display so users don't ask "what is this"
- [x] **POL-09**: Terminal → Strategy/Signal actions — create strategy or signal for current instrument directly from terminal
- [ ] **POL-10**: AI chat mode — free-form conversation instead of quiz for strategy creation/discussion

### UX Audit

- [ ] **UXA-01**: Playwright screenshots of every dashboard page (desktop 1440px + mobile 390px)
- [ ] **UXA-02**: User flow tests — create strategy (manual + AI), create signal, view portfolio, terminal chart, AI analysis
- [ ] **UXA-03**: Document UX issues — confusing labels, overloaded screens, unclear navigation, dead ends, missing feedback
- [ ] **UXA-04**: Triage issues into "fix now" vs "backlog" by severity
- [ ] **UXA-05**: Fix all "fix now" issues (quick wins discovered during audit)

### Fundamentals

- [x] **FUND-01**: FundamentalService fetches P/E, P/B, dividend yield per ticker (P/E/P/B source TBD — see INFR-02b)
- [x] **FUND-02**: Composite scoring (1-10) with weighted average of P/E, P/B, dividend metrics
- [ ] **FUND-03**: Color indication per metric (green=cheap, yellow=normal, red=expensive)
- [ ] **FUND-04**: Fundamental card appears in portfolio position expand (below chart)
- [ ] **FUND-05**: AI fundamental analysis button — DeepSeek evaluates multiples + price

### Correlations & Cohorts

- [ ] **CORR-01**: Pearson correlation matrix from daily returns (T-Invest candles, 248 days)
- [ ] **CORR-02**: Correlation heatmap via @nivo/heatmap styled in dark theme
- [ ] **CORR-03**: High correlation warning threshold (>0.7) with visual indicator
- [ ] **CORR-04**: Server-side calculation with Redis cache (24h TTL)
- [ ] **COHT-01**: Cohort breakdown by asset type (shares/bonds/ETF)
- [ ] **COHT-02**: Cohort breakdown by sector (mapping table ~50 tickers)
- [ ] **COHT-03**: Cohort breakdown by trade success (profitable vs unprofitable)
- [ ] **COHT-04**: Pie/donut charts for cohort visualization (@nivo/pie)

### Portfolio Optimization

- [ ] **OPTM-01**: Covariance matrix from daily returns with Ledoit-Wolf shrinkage
- [ ] **OPTM-02**: Markowitz optimization for max Sharpe ratio with weight constraints (configurable 15%/25%/50%)
- [ ] **OPTM-03**: Current vs optimal weight comparison (two donut charts side by side)
- [ ] **OPTM-04**: Concrete rebalancing actions ("Sell X lots of TICKER, buy Y lots of TICKER")
- [ ] **OPTM-05**: Actions account for broker commission and minimum lot size
- [ ] **OPTM-06**: AI commentary on rebalancing recommendation via DeepSeek

### AI Analysis (Cross-cutting)

- [x] **AIAN-01**: Reusable AiAnalysisButton component — button opens dialog with streaming DeepSeek response
- [x] **AIAN-02**: Different system prompts per analytics block (chart, risk, fundamental, optimization, full portfolio)
- [ ] **AIAN-03**: Full portfolio AI analysis button — comprehensive analysis with all data

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Deep Terminal

- **TERM-01**: Order book (стакан) visualization
- **TERM-02**: Trade tape (лента сделок)
- **TERM-03**: AlgoPack integration (MOEX advanced data)
- **TERM-04**: Drawing tools on chart (trend lines, Fibonacci)
- **TERM-05**: Multiple chart layouts (split screen)

### Advanced Analytics

- **ADVN-01**: ROE, ROA, PEG, Debt/Equity ratios (needs paid API)
- **ADVN-02**: Monte Carlo simulation for portfolio projection
- **ADVN-03**: Efficient frontier visualization (full curve, not single point)
- **ADVN-04**: Multi-account portfolio aggregation

## Out of Scope

| Feature | Reason |
|---------|--------|
| SMTP email for forgot-password | Telegram OTP is sufficient |
| Real-time streaming analytics | Computation too heavy for real-time; on-demand is sufficient |
| PDF/Excel export of analytics | Adds complexity, low user demand currently |
| Social/sharing features | Not core value |
| OAuth (Google/GitHub) | Email + password sufficient |
| TradingView iframe widget | No style control, no custom markers |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-01 | Phase 1 | Complete |
| INFR-02a | Phase 1 | Complete |
| INFR-02b | Phase 3 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-05 | Phase 1 | Complete |
| INFR-06 | Phase 1 | Complete |
| CHRT-01 | Phase 1 | Complete |
| CHRT-02 | Phase 1 | Complete |
| CHRT-03 | Phase 1 | Complete |
| CHRT-04 | Phase 1 | Pending |
| CHRT-05 | Phase 1 | Pending |
| CHRT-06 | Phase 1 | Pending |
| CHRT-07 | Phase 1 | Complete |
| AIAN-01 | Phase 1 | Complete |
| AIAN-02 | Phase 1 | Complete |
| RISK-01 | Phase 2 | Pending |
| RISK-02 | Phase 2 | Pending |
| RISK-03 | Phase 2 | Pending |
| RISK-04 | Phase 2 | Pending |
| RISK-05 | Phase 2 | Pending |
| RISK-06 | Phase 2 | Pending |
| RISK-07 | Phase 2 | Pending |
| RISK-08 | Phase 2 | Pending |
| RISK-09 | Phase 2 | Pending |
| POL-01 | Phase 3 | Pending |
| POL-02 | Phase 3 | Pending |
| POL-03 | Phase 3 | Complete |
| POL-04 | Phase 3 | Complete |
| POL-05 | Phase 3 | Complete |
| POL-06 | Phase 3 | Complete |
| POL-07 | Phase 3 | Pending |
| POL-08 | Phase 3 | Pending |
| POL-09 | Phase 3 | Complete |
| POL-10 | Phase 3 | Pending |
| UXA-01 | Phase 3.1 | Pending |
| UXA-02 | Phase 3.1 | Pending |
| UXA-03 | Phase 3.1 | Pending |
| UXA-04 | Phase 3.1 | Pending |
| UXA-05 | Phase 3.1 | Pending |
| FUND-01 | Phase 3 | Complete |
| FUND-02 | Phase 3 | Complete |
| FUND-03 | Phase 3 | Pending |
| FUND-04 | Phase 3 | Pending |
| FUND-05 | Phase 3 | Pending |
| CORR-01 | Phase 4 | Pending |
| CORR-02 | Phase 4 | Pending |
| CORR-03 | Phase 4 | Pending |
| CORR-04 | Phase 4 | Pending |
| COHT-01 | Phase 4 | Pending |
| COHT-02 | Phase 4 | Pending |
| COHT-03 | Phase 4 | Pending |
| COHT-04 | Phase 4 | Pending |
| OPTM-01 | Phase 5 | Pending |
| OPTM-02 | Phase 5 | Pending |
| OPTM-03 | Phase 5 | Pending |
| OPTM-04 | Phase 5 | Pending |
| OPTM-05 | Phase 5 | Pending |
| OPTM-06 | Phase 5 | Pending |
| AIAN-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 60 total (45 original + 10 MVP Polish + 5 UX Audit)
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 — INFR-02 split: INFR-02a (dividends, Phase 1) + INFR-02b (P/E, P/B, deferred to Phase 3)*
