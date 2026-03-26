# Requirements: AculaTrade v1.1

**Defined:** 2026-03-25
**Core Value:** AI-помощник, который думает вместе с трейдером — свободный диалог, автоматическое создание стратегий, глубокая аналитика портфеля лучше чем у Т-Инвест.

## v1.1 Requirements

### AI Revolution

- [x] **AIREV-01**: User can create strategy through free-form dialog — AI auto-generates strategy params when enough context gathered
- [x] **AIREV-02**: User sees live strategy preview updating as AI fills parameters during conversation
- [x] **AIREV-03**: User can click "Create Strategy from Analysis" after AI technical analysis in terminal
- [x] **AIREV-04**: User can click "Create Signal from Analysis" after AI technical analysis in terminal
- [x] **AIREV-05**: User can use expanded set of indicators (ATR, Stochastic, VWAP, Williams %R) in strategy conditions
- [x] **AIREV-06**: User can use expanded set of conditions (BETWEEN range, percent-based thresholds) in strategy builder

### Terminal Depth

- [x] **TERM-01**: User sees "Top Gainers" block with instruments sorted by daily % change (positive)
- [x] **TERM-02**: User sees "Top Losers" block with instruments sorted by daily % change (negative)
- [x] **TERM-03**: User can click any top mover to load its chart in terminal

### Data Consistency & UX Fixes

- [ ] **DFIX-01**: Paper portfolio P&L matches strategy page P&L for the same strategy
- [ ] **DFIX-02**: TopMovers click navigates to instrument chart immediately
- [ ] **DFIX-03**: Paper portfolio shows strategy name, instrument, operations breakdown (profitable/unprofitable count)
- [ ] **DFIX-04**: All instruments always use algovist ticker variant matching T-Invest prices

### Portfolio Analytics

- [ ] **PORT-01**: User sees correlation heatmap showing how positions move relative to each other
- [ ] **PORT-02**: User sees high-correlation pairs (>0.7) visually flagged on the heatmap
- [ ] **PORT-03**: User sees sector allocation as donut/pie chart
- [ ] **PORT-04**: User sees cohort breakdown by asset type (stocks, bonds, ETF, currency)
- [ ] **PORT-05**: User sees cohort breakdown by trade success (profitable vs unprofitable positions)
- [ ] **PORT-06**: User sees current vs optimal portfolio weights (Markowitz) as side-by-side comparison
- [ ] **PORT-07**: User sees concrete rebalancing actions ("Sell X lots of TICKER, buy Y lots of TICKER")
- [ ] **PORT-08**: User can click full portfolio AI analysis button and receive comprehensive streaming analysis covering risk, fundamentals, correlations, and optimization

### Analytics Data Quality & Depth

- [x] **AQFIX-01**: Asset type chart correctly maps STOCK/ETF/BOND/CURRENCY/FUTURES to Russian labels and colors (no case mismatch)
- [x] **AQFIX-02**: Break-even strategies (pnl === 0) counted separately in trade success breakdown
- [x] **AQFIX-03**: Trade success breakdown uses batch query instead of N+1 per-strategy queries
- [x] **AQFIX-04**: Portfolio shows Herfindahl concentration index with warning when single position > 40% of portfolio
- [x] **AQFIX-05**: Portfolio shows return vs IMOEX benchmark for matching period (30/90/180 days)
- [x] **AQFIX-06**: Portfolio shows aggregate dividend yield based on position weights and fundamentals data
- [x] **AQFIX-07**: Trade success shows P&L breakdown by individual instrument (not just strategy-level)
- [x] **AQFIX-08**: User can switch correlation period between 30/60/90/180 days

### Realtime Prices & UX Fixes

- [x] **RTPRICE-01**: Terminal price updates in real-time (<1s delay) matching T-Invest to the kopeck via Tinkoff MarketDataStream
- [x] **RTPRICE-02**: All price displays across the app use the same real-time price source (worker as authority)
- [x] **RTPRICE-03**: Paper portfolio has date filter (Все время/Сегодня/Вчера/7 дней/30 дней)
- [x] **RTPRICE-04**: Terminal hides empty "Открытые позиции" and "История сделок" blocks when no data
- [x] **RTPRICE-05**: TopMovers tickers are clickable links that navigate to the instrument chart
- [x] **RTPRICE-06**: Mobile AI button has full label text
- [x] **RTPRICE-07**: Paper portfolio shows actual purchase amounts (not strategy settings amounts)
- [x] **RTPRICE-08**: All tickers are consistently uppercase across the entire system

## v2 Requirements

### AI Advanced

- **AIADV-01**: Scripted strategies (Pine Script-like code editor)
- **AIADV-02**: News constructor with per-instrument AI alerts to Telegram

### Terminal Advanced

- **TERMADV-01**: Order placement form (buy/sell, limit/market)
- **TERMADV-02**: Active orders panel
- **TERMADV-03**: Drawing tools on chart (trend lines, Fibonacci)

### Advanced Analytics

- **ADVN-01**: ROE, ROA, PEG, Debt/Equity ratios (needs paid API)
- **ADVN-02**: Monte Carlo simulation for portfolio projection
- **ADVN-03**: Efficient frontier visualization (full curve, not single point)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Streaming AI responses for strategy gen | Server Actions sufficient, SSE adds complexity without UX benefit |
| Real-time correlation updates | Noisy, cache 1h — correlation doesn't change intraday |
| Interactive efficient frontier scatter | High complexity, low value for retail MOEX portfolios |
| Scripted strategies (Pine Script) | v2 — requires custom language parser |
| News constructor | v2 — requires news API integration |
| Order placement in terminal | Anton: not needed yet |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AIREV-01 | Phase 4 | Complete |
| AIREV-02 | Phase 4 | Complete |
| AIREV-03 | Phase 4 | Complete |
| AIREV-04 | Phase 4 | Complete |
| AIREV-05 | Phase 4 | Complete |
| AIREV-06 | Phase 4 | Complete |
| TERM-01 | Phase 5 | Complete |
| TERM-02 | Phase 5 | Complete |
| TERM-03 | Phase 5 | Complete |
| PORT-01 | Phase 6 | Pending |
| PORT-02 | Phase 6 | Pending |
| PORT-03 | Phase 6 | Pending |
| PORT-04 | Phase 6 | Pending |
| PORT-05 | Phase 6 | Pending |
| PORT-06 | Phase 7 | Pending |
| PORT-07 | Phase 7 | Pending |
| PORT-08 | Phase 7 | Pending |
| AQFIX-01 | Phase 6.1 | Complete |
| AQFIX-02 | Phase 6.1 | Complete |
| AQFIX-03 | Phase 6.1 | Complete |
| AQFIX-04 | Phase 6.1 | Complete |
| AQFIX-05 | Phase 6.1 | Complete |
| AQFIX-06 | Phase 6.1 | Complete |
| AQFIX-07 | Phase 6.1 | Complete |
| AQFIX-08 | Phase 6.1 | Complete |
| RTPRICE-01 | Phase 6.2 | Complete |
| RTPRICE-02 | Phase 6.2 | Complete |
| RTPRICE-03 | Phase 6.2 | Complete |
| RTPRICE-04 | Phase 6.2 | Complete |
| RTPRICE-05 | Phase 6.2 | Complete |
| RTPRICE-06 | Phase 6.2 | Complete |
| RTPRICE-07 | Phase 6.2 | Complete |
| RTPRICE-08 | Phase 6.2 | Complete |

**Coverage:**
- v1.1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-26 — added RTPRICE requirements for Phase 6.2*
