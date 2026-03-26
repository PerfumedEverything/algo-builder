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

**Coverage:**
- v1.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 — traceability mapped after roadmap creation*
