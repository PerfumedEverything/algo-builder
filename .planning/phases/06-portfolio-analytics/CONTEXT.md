# Phase 6: Portfolio Analytics — Correlations, Sector & Cohorts

## Requirements
- PORT-01: Correlation heatmap showing how positions move relative to each other
- PORT-02: High-correlation pairs (>0.7) visually flagged on the heatmap
- PORT-03: Sector allocation as donut/pie chart
- PORT-04: Cohort breakdown by asset type (stocks, bonds, ETF, currency)
- PORT-05: Cohort breakdown by trade success (profitable vs unprofitable positions)

## Existing Infrastructure
- **Sector data**: `FUNDAMENTALS_MAP` in `core/data/fundamentals-map.ts` — every major ticker has sector field
- **simple-statistics**: installed (v7.8.9), used in `risk-calculations.ts` — has `mean`, `standardDeviation`, `quantileSorted`
- **Portfolio page**: `/portfolio` with tabs (Broker / Paper). Has positions, risk metrics, fundamentals cards
- **Candle fetching**: `BrokerService.getCandles(userId, params)` for historical price data
- **MOEXProvider**: IMOEX candles, dividends, top movers with Redis cache
- **Position types**: Portfolio has `positions[]` with `instrumentId`, `ticker`, `type` (share/etf/bond/currency), `quantity`, `currentPrice`, `averagePrice`

## Charts Strategy
- No chart library installed currently (lightweight-charts for candles only)
- Install **recharts** — already in project CLAUDE.md stack, needed for donut/pie/bar charts
- For heatmap: custom Tailwind grid (no need for @nivo — correlation matrix is just a colored grid)

## Key Architecture Decisions
- Pearson correlation via simple-statistics `sampleCorrelation()`
- Need 30+ trading days of daily closes for meaningful correlation
- Sector allocation uses existing `FUNDAMENTALS_MAP` sectors + position market values
- Asset type breakdown from portfolio position `type` field
- Trade success from operation stats (already have profitableOps/unprofitableOps)

## Data Flow
1. Get user portfolio positions → extract tickers
2. Fetch 90 days of daily candles per ticker → calculate daily returns
3. Compute pairwise Pearson correlation matrix
4. Sector allocation from FUNDAMENTALS_MAP + position values
5. Asset type from position.type
6. Trade success from operation stats
