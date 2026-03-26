# Phase 6.1: Analytics Data Quality & Depth - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Source:** Code audit of Phase 6 implementation + user request for deeper analytics

<domain>
## Phase Boundary

Fix all data correctness bugs found in Phase 6 analytics code, then add deeper analytics features that T-Invest doesn't have: portfolio concentration metrics, IMOEX benchmark comparison, dividend yield, instrument-level P&L, and configurable correlation periods.

</domain>

<decisions>
## Implementation Decisions

### Bug Fixes (Locked)
- Asset type color mapping uses lowercase keys ("share") but PortfolioPosition.instrumentType is uppercase ("STOCK") — fix to case-insensitive matching
- Break-even strategies (pnl === 0) silently dropped from trade success chart — add "break-even" category or count with profitable
- N+1 query in getTradeSuccessBreakdown: fetches stats per strategy individually — batch with Promise.all or aggregate query
- Correlation returns 0 silently when <5 data points — show warning to user instead

### New Features (Locked)
- **Herfindahl concentration index**: calculate HHI from position weights, show as card with color indicator (green <0.15, yellow 0.15-0.25, red >0.25), warn when single position >40%
- **IMOEX benchmark comparison**: fetch IMOEX index candles for same period as portfolio, calculate portfolio return vs benchmark return, show delta. Use existing MOEXProvider.getCandles
- **Aggregate dividend yield**: weighted average of position dividend yields from FUNDAMENTALS_MAP, show as card
- **Instrument-level P&L**: in trade success section, show P&L per ticker (aggregate across all strategies for same instrument)
- **Configurable correlation period**: dropdown to switch between 30/60/90/180 days, re-fetch correlation matrix on change

### Claude's Discretion
- Layout of new metrics within the analytics tab
- Loading states for new components
- Whether to add a "concentration" sub-section or integrate into existing layout

</decisions>

<canonical_refs>
## Canonical References

### Analytics Implementation (Phase 6)
- `src/server/services/portfolio-analytics-service.ts` — current analytics service with 4 methods
- `src/server/actions/analytics-actions.ts` — current server actions
- `src/core/types/analytics.ts` — current type definitions
- `src/components/portfolio/correlation-heatmap.tsx` — heatmap component
- `src/components/portfolio/sector-donut.tsx` — sector chart
- `src/components/portfolio/asset-type-chart.tsx` — asset type chart (has bug)
- `src/components/portfolio/trade-success-chart.tsx` — trade success chart (has bug)
- `src/app/(dashboard)/portfolio/page.tsx` — portfolio page with analytics tab

### Data Sources
- `src/core/data/fundamentals-map.ts` — static fundamentals with sector + dividendYield
- `src/server/services/broker-service.ts` — BrokerService.getCandles() for price data
- `src/server/services/operation-service.ts` — OperationService.getStats() for P&L
- `src/server/repositories/strategy-repository.ts` — strategy queries
- `src/server/providers/moex/moex-iss-provider.ts` — MOEX ISS for IMOEX index data

### Types
- `src/core/types/broker.ts` — PortfolioPosition type (instrumentType: "STOCK" | "BOND" | "CURRENCY" | "FUTURES" | "ETF")

</canonical_refs>

<specifics>
## Specific Ideas

### Asset Type Bug Fix
Current TYPE_COLORS in asset-type-chart.tsx uses lowercase keys: `share`, `etf`, `bond`, `currency`.
PortfolioPosition.instrumentType values are: `STOCK`, `BOND`, `CURRENCY`, `FUTURES`, `ETF`.
Fix: normalize to lowercase or use case-insensitive map. Also rename "share" → match "STOCK".

### Herfindahl Index
HHI = sum of (weight_i)^2 for all positions where weight_i = position_value / total_value.
- HHI < 0.15 = diversified (green)
- 0.15 <= HHI < 0.25 = moderately concentrated (yellow)
- HHI >= 0.25 = concentrated (red)
Additional: flag any single position > 40% as "dominant position risk"

### IMOEX Benchmark
Use MOEXProvider to fetch IMOEX (or IMOEX2) candles for the same period.
Calculate simple return: (end_price - start_price) / start_price * 100.
Show side-by-side: "Your portfolio: +X%" vs "IMOEX: +Y%" with delta.

### Correlation Period Selector
Add dropdown/select above heatmap: 30d / 60d / 90d / 180d.
Pass selectedPeriod to getCorrelationMatrixAction. Default: 90d (current behavior).

</specifics>

<deferred>
## Deferred Ideas

- Dynamic fundamentals update from MOEX API (keep static map for now, add freshness warning)
- Transaction cost / commission deduction from P&L (not available in current data model)
- Currency exposure analysis (all positions assumed RUB for now)
- Sector rotation momentum analysis

</deferred>

---

*Phase: 06.1-analytics-data-quality*
*Context gathered: 2026-03-26 via code audit*
