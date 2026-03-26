# Phase 5: Terminal Top Movers - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Display the biggest daily gainers and losers on the terminal page. Users see two panels (Top Gainers, Top Losers) with 5 instruments each, can click any to load its chart. Backend is fully complete — this phase is UI-only.

</domain>

<decisions>
## Implementation Decisions

### Panel Placement
- **D-01:** Top Movers panels go directly below the chart+order book row, ABOVE positions and trade history panels
- **D-02:** Gainers panel on the left, Losers panel on the right — two-column grid matching existing layout pattern
- **D-03:** Positions and Trade History panels move below Top Movers (third row)

### Row Information Density
- **D-04:** Compact row format: Ticker + short name + price (₽) + % change (color-coded green/red)
- **D-05:** 5 rows per panel, matching backend topN=5 default
- **D-06:** Each row is clickable — loads instrument in chart via existing handleQuickSelect

### Data & Refresh
- **D-07:** Auto-refresh every 60 seconds (aligned with backend Redis cache TTL)
- **D-08:** Show loading skeleton on initial load, silent refresh after first load

### Claude's Discretion
- Market hours handling (badge for closed market, stale data label)
- Mobile responsive behavior (stack panels vertically on small screens)
- Animation on data refresh (subtle or none)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Terminal Infrastructure
- `src/core/types/terminal.ts` — TopMover type definition (ticker, shortName, price, changePct, volume, high, low)
- `src/server/actions/terminal-actions.ts` — getTopMoversAction server action (lines 30-38)
- `src/server/providers/analytics/moex-provider.ts` — getTopMovers() with Redis cache, parseTopMoversResponse

### Terminal Page
- `src/app/(dashboard)/terminal/page.tsx` — Current terminal layout, handleQuickSelect callback for ticker navigation

### Existing Terminal Components
- `src/components/terminal/price-bar.tsx` — PriceBar component pattern
- `src/components/terminal/order-book.tsx` — OrderBook component pattern
- `src/components/terminal/positions-panel.tsx` — PositionsPanel pattern (will be reordered below Top Movers)

### Tests
- `src/__tests__/terminal/top-movers.test.ts` — Existing backend tests for parseTopMoversResponse

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getTopMoversAction()` — server action returning `{ gainers: TopMover[]; losers: TopMover[] }`, ready to use
- `handleQuickSelect(ticker)` — existing callback on terminal page that loads instrument by ticker
- `Skeleton` component from shadcn/ui — used throughout for loading states
- Card/border patterns from existing terminal panels (OrderBook, PositionsPanel)

### Established Patterns
- Terminal panels use `rounded-lg border border-border bg-card p-4` styling
- Grid layout: `grid grid-cols-1 lg:grid-cols-2 gap-4` for two-column sections
- Server action pattern: `const res = await action(); if (res.success) setState(res.data)`
- useCallback + useEffect for data fetching with cleanup intervals

### Integration Points
- Terminal page.tsx — insert TopMovers grid between chart/orderbook row and positions/trades row
- No new server actions needed — getTopMoversAction already exists and exported

</code_context>

<specifics>
## Specific Ideas

- Goal is to be deeper and more useful than Т-Инвест's top movers
- Anton wants the terminal to feel like a professional tool, not a toy
- Compact professional appearance like Bloomberg Terminal

</specifics>

<deferred>
## Deferred Ideas

- AI commentary on top movers ("why SBER is rising today") — could be Phase 8 scope
- Sector filter for top movers — future enhancement
- Historical top movers (week/month view) — future enhancement

</deferred>

---

*Phase: 05-terminal-top-movers*
*Context gathered: 2026-03-26*
