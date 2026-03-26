# Phase 05: Terminal Top Movers - Research

**Researched:** 2026-03-26
**Domain:** React component authoring — terminal UI panel with polling, market hours detection
**Confidence:** HIGH

## Summary

Phase 05 is a pure UI phase. The entire backend is already shipped: `getTopMoversAction()` returns `{ gainers: TopMover[]; losers: TopMover[] }`, with Redis cache TTL of 60 seconds. The component needs to poll every 60 s, show skeleton on first load, then silently refresh. All data shape, formatting utilities, styling patterns, and the click handler (`handleQuickSelect`) are already present in the codebase.

The only new work is one new component `TopMoversPanel` (or split `TopGainersPanel` / `TopLosersPanel`), and a small insertion into `terminal/page.tsx` to render the two-column grid between the chart/orderbook row and the positions/trades row. Market-hours detection (09:50–18:50 MSK Mon–Fri) is the only logic that is not already present and requires a small pure utility function.

**Primary recommendation:** Build a single `TopMoversPanel` component that receives `gainers` and `losers` props and renders both columns, managed by a `useTopMovers` custom hook in the terminal page — matching the existing polling pattern used for order book refresh.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Top Movers panels go directly below the chart+order book row, ABOVE positions and trade history panels
- D-02: Gainers panel on the left, Losers panel on the right — two-column grid matching existing layout pattern
- D-03: Positions and Trade History panels move below Top Movers (third row)
- D-04: Compact row format: Ticker + short name + price (₽) + % change (color-coded green/red)
- D-05: 5 rows per panel, matching backend topN=5 default
- D-06: Each row is clickable — loads instrument in chart via existing handleQuickSelect
- D-07: Auto-refresh every 60 seconds (aligned with backend Redis cache TTL)
- D-08: Show loading skeleton on initial load, silent refresh after first load

### Claude's Discretion
- Market hours handling (badge for closed market, stale data label)
- Mobile responsive behavior (stack panels vertically on small screens)
- Animation on data refresh (subtle or none)

### Deferred Ideas (OUT OF SCOPE)
- AI commentary on top movers ("why SBER is rising today") — could be Phase 8 scope
- Sector filter for top movers — future enhancement
- Historical top movers (week/month view) — future enhancement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERM-01 | User sees "Top Gainers" block with instruments sorted by daily % change (positive) | `gainers: TopMover[]` already returned by `getTopMoversAction()`, sorted desc by `changePct` |
| TERM-02 | User sees "Top Losers" block with instruments sorted by daily % change (negative) | `losers: TopMover[]` already returned by `getTopMoversAction()`, sorted asc by `changePct` |
| TERM-03 | User can click any top mover to load its chart in terminal | `handleQuickSelect(ticker)` already exists on terminal page, takes ticker string |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React hooks (useState, useEffect, useCallback) | 19 (Next.js 15) | Polling interval, loading state | Project standard |
| shadcn/ui Skeleton | installed | Loading state on first fetch | Project standard, used in all terminal panels |
| Tailwind CSS | v4 | Styling | Project standard, no custom CSS allowed |
| Lucide | installed | Icons (e.g. TrendingUp, TrendingDown for panel headers, Clock for market-closed badge) | Project standard — only icon library |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `formatPrice`, `formatChange`, `getChangeColor` from `@/lib/terminal-utils` | — | Price and % formatting, color coding | Use directly — do not re-implement |
| `getTopMoversAction` from `@/server/actions/terminal-actions` | — | Server action for data | Only data source for this phase |

No new npm packages required.

## Architecture Patterns

### Recommended File Structure
```
src/
├── components/terminal/
│   └── top-movers-panel.tsx      # New: single component, receives gainers+losers+loading+onSelect
├── app/(dashboard)/terminal/
│   └── page.tsx                  # Modified: add useTopMovers state+effect, insert TopMoversPanel JSX
└── lib/
    └── market-hours.ts           # New: isMarketOpen() pure utility (MSK timezone check)
```

### Pattern 1: Polling with useEffect + setInterval (existing in codebase)
**What:** Fetch on mount, then schedule interval with cleanup. Show skeleton only when `data === null` (first load), silent on subsequent fetches.
**When to use:** Matches D-07 (60s refresh) and D-08 (skeleton on initial, silent after).

**Existing reference (order book, line 126-130 in terminal/page.tsx):**
```typescript
// Source: src/app/(dashboard)/terminal/page.tsx
useEffect(() => {
  if (!instrument?.figi) return
  fetchOrderBook(instrument.figi)
  const interval = setInterval(() => fetchOrderBook(instrument.figi), 5000)
  return () => clearInterval(interval)
}, [instrument, fetchOrderBook])
```

**Top movers adaptation (no instrument dependency — always active):**
```typescript
// In terminal/page.tsx — add alongside existing data-fetching hooks
const [topMovers, setTopMovers] = useState<{ gainers: TopMover[]; losers: TopMover[] } | null>(null)
const [topMoversLoading, setTopMoversLoading] = useState(false)

const fetchTopMovers = useCallback(async () => {
  if (!topMovers) setTopMoversLoading(true)   // skeleton only on first load (D-08)
  try {
    const res = await getTopMoversAction()
    if (res.success) setTopMovers(res.data)
  } finally {
    setTopMoversLoading(false)
  }
}, [topMovers])

useEffect(() => {
  fetchTopMovers()
  const id = setInterval(fetchTopMovers, 60_000)
  return () => clearInterval(id)
}, [])  // empty deps — starts on page mount, independent of instrument selection
```

### Pattern 2: TopMoversPanel Component Structure
**What:** Single component receiving both gainers and losers, renders two-column grid internally. Follows existing panel card style.

```typescript
// Source: established pattern from src/components/terminal/positions-panel.tsx
type TopMoversPanelProps = {
  gainers: TopMover[]
  losers: TopMover[]
  loading?: boolean
  onSelect: (ticker: string) => void
  isMarketOpen: boolean
}
```

**Card styling (matches all terminal panels):**
```typescript
// rounded-lg border border-border bg-card overflow-hidden
// Header: px-3 py-2 border-b border-border
```

### Pattern 3: Market Hours Detection (Claude's Discretion)
**What:** Pure utility — check if current UTC time falls within MOEX trading hours (09:50–18:50 MSK, Mon–Fri). MSK = UTC+3.

```typescript
// src/lib/market-hours.ts
export const isMarketOpen = (now = new Date()): boolean => {
  const mskOffset = 3 * 60   // UTC+3 in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const mskMinutes = (utcMinutes + mskOffset) % (24 * 60)
  const mskDay = /* derive day of week in MSK */ ...
  if (mskDay === 0 || mskDay === 6) return false   // weekend
  return mskMinutes >= 9 * 60 + 50 && mskMinutes < 18 * 60 + 50
}
```

**Usage:** Compute once in terminal page, pass as prop to TopMoversPanel. Recompute on each 60s poll tick.

### Pattern 4: Mobile Responsive (Claude's Discretion)
**What:** Stack panels vertically on small screens, same as existing positions/trades row.
**Implementation:** `grid grid-cols-1 lg:grid-cols-2 gap-4` — identical to the existing two-column pattern on line 293 of `terminal/page.tsx`.

### Anti-Patterns to Avoid
- **Separate state for gainers/losers:** Keep as a single `{ gainers, losers }` object — they come from one server action call. Splitting state would double the fetches.
- **Polling inside the component:** Keep interval in the page, pass data via props — consistent with how order book and positions are managed.
- **Re-fetching on instrument select:** Top movers are market-wide, not instrument-specific. The useEffect must have empty deps `[]`, not depend on `instrument`.
- **Showing skeleton on re-poll:** Only set `topMoversLoading = true` when `topMovers === null` (first load). Silent background refresh for subsequent polls (D-08).
- **Animation on refresh:** Keep it absent or extremely subtle (no layout shift, no flash) — professional tool aesthetic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Price formatting | Custom `toFixed()` logic | `formatPrice()` from `@/lib/terminal-utils` | Already handles `ru-RU` locale, consistent across all panels |
| % change color coding | Inline ternary | `getChangeColor()` from `@/lib/terminal-utils` | Returns `text-emerald-500` / `text-red-500` / `text-muted-foreground` — consistent with project |
| % change display | Custom formatter | `formatChange()` from `@/lib/terminal-utils` | Handles `+` prefix, `ru-RU` decimals |
| Loading skeleton | Custom spinner/placeholder | `<Skeleton>` from shadcn/ui | Project-wide standard |
| Icons | SVG or custom | Lucide: `TrendingUp`, `TrendingDown`, `Clock` | Only icon library allowed |

## Common Pitfalls

### Pitfall 1: Interval Not Cleared on Unmount
**What goes wrong:** Memory leak and ghost fetches after page navigation.
**Why it happens:** Forgetting `return () => clearInterval(id)` in useEffect.
**How to avoid:** Always return cleanup from the useEffect that sets the interval.
**Warning signs:** Console errors about state update on unmounted component.

### Pitfall 2: Market Hours Off-by-One — Wrong Day in MSK
**What goes wrong:** Day-of-week calculation uses UTC day instead of MSK day. A trade on Monday morning UTC may still be Sunday 22:00 MSK.
**Why it happens:** `getUTCDay()` gives UTC day, not local MSK day.
**How to avoid:** Convert full datetime to MSK offset before extracting day-of-week. Use `toLocaleDateString('en', { timeZone: 'Europe/Moscow', weekday: 'short' })` or manual UTC+3 offset math.

### Pitfall 3: Skeleton Flash on Silent Refresh
**What goes wrong:** Panel blinks skeleton every 60 seconds.
**Why it happens:** Setting `loading = true` unconditionally before every fetch.
**How to avoid:** Gate the loading flag: `if (!topMovers) setTopMoversLoading(true)` — only skeleton when data is absent (first load or error reset).

### Pitfall 4: handleQuickSelect Async — No Loading Feedback
**What goes wrong:** User clicks a ticker row and nothing appears to happen for 1-2 seconds while `getInstrumentsAction` resolves.
**Why it happens:** `handleQuickSelect` fetches the full instrument list first.
**How to avoid:** This is pre-existing behavior. Acceptable as-is since the function already exists and works. Do not refactor it in this phase.

### Pitfall 5: TopMoversPanel Positioned Outside Instrument-Conditional Block
**What goes wrong:** Panels don't render because they are inside the `{instrument && ...}` JSX block.
**Why it happens:** Top movers are market-wide — they should render regardless of instrument selection, especially useful as a discovery tool when no instrument is selected.
**How to avoid:** Place the `<TopMoversPanel>` outside of the `{instrument && (...)}` conditional in page.tsx, OR inside it but ALSO outside — the layout decision per CONTEXT.md (D-01) places it below chart row, which is inside the instrument block. Per the page structure, `TopMoversPanel` should render even when no instrument is selected (useful for discovery). Planner should decide: render always, or only when instrument is selected. Research recommendation: render ALWAYS (below the empty-state "Выберите инструмент" box) since it serves as navigation/discovery.

### Pitfall 6: `isMarketOpen` Called Once, Not Refreshed
**What goes wrong:** Badge shows "closed" even after market opens because the check was computed on mount.
**Why it happens:** Computing `isMarketOpen` once at render without re-evaluating on poll.
**How to avoid:** Recompute `isMarketOpen()` inside `fetchTopMovers` callback and store in state, so it updates every 60s tick.

## Code Examples

### Row Item — Compact Format (D-04)
```typescript
// Pattern matching positions-panel.tsx compact row style
<button
  type="button"
  onClick={() => onSelect(mover.ticker)}
  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
>
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-sm font-semibold font-mono">{mover.ticker}</span>
    <span className="text-xs text-muted-foreground truncate">{mover.shortName}</span>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-sm font-mono">{formatPrice(mover.price)} ₽</span>
    <span className={`text-xs font-mono ${getChangeColor(mover.changePct)}`}>
      {formatChange(mover.changePct)}
    </span>
  </div>
</button>
```

### Skeleton Rows — 5 Items
```typescript
// Matches order-book.tsx SkeletonRows pattern
const SkeletonRows = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    ))}
  </>
)
```

### Market Closed Badge
```typescript
// Claude's Discretion — use Lucide Clock icon, muted styling
import { Clock } from "lucide-react"

{!isMarketOpen && (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
    <Clock className="h-3 w-3" />
    Биржа закрыта
  </span>
)}
```

### Panel Layout in page.tsx (insertion point)
```typescript
// Insert between line 291 (end of chart/orderbook grid) and line 293 (positions/trades grid)
// Current structure in terminal/page.tsx (inside {instrument && (...)}}:
// Row 1: chart + orderbook   ← lines 275-291
// [INSERT HERE]: TopMoversPanel
// Row 3: positions + trades  ← lines 293-304

<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <TopMoversSection
    title="Топ роста"
    icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
    movers={gainers}
    loading={topMoversLoading}
    onSelect={handleQuickSelect}
    isMarketOpen={isMarketOpen}
  />
  <TopMoversSection
    title="Топ падения"
    icon={<TrendingDown className="h-4 w-4 text-red-500" />}
    movers={losers}
    loading={topMoversLoading}
    onSelect={handleQuickSelect}
    isMarketOpen={isMarketOpen}
  />
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useInterval custom hook | Native useEffect + setInterval + cleanup | React 18+ | No external library needed |
| Moment.js timezone | `Intl` API or manual UTC offset | 2020+ | Native, zero dependency |

## Open Questions

1. **Render when no instrument selected?**
   - What we know: panels are placed "below chart row" (D-01), chart row only renders when `instrument` is set
   - What's unclear: should top movers show even before an instrument is selected?
   - Recommendation: Render ALWAYS — doubles as discovery UI and fulfills "deeper than T-Invest" goal. Place `<TopMoversPanel>` outside the `{instrument && ...}` block (alongside the empty-state prompt). This requires the polling to always run.

2. **Animation on refresh (Claude's Discretion)**
   - What we know: professional terminal aesthetic, Bloomberg-style
   - What's unclear: subtle fade-in on new data vs. no animation
   - Recommendation: No animation. Silent in-place data swap. Matches Bloomberg terminal behavior and avoids visual noise.

## Environment Availability

Step 2.6: SKIPPED — this phase is purely frontend component authoring. No external services, CLI tools, or runtimes beyond the existing Next.js dev server are required.

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/__tests__/terminal/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TERM-01 | Gainers rendered sorted desc by changePct | unit | `npx vitest run src/__tests__/terminal/top-movers-panel.test.tsx -x` | Wave 0 |
| TERM-02 | Losers rendered sorted asc by changePct | unit | `npx vitest run src/__tests__/terminal/top-movers-panel.test.tsx -x` | Wave 0 |
| TERM-03 | Row click calls onSelect with correct ticker | unit | `npx vitest run src/__tests__/terminal/top-movers-panel.test.tsx -x` | Wave 0 |
| isMarketOpen | Returns true/false for MSK hours, weekends | unit | `npx vitest run src/__tests__/lib/market-hours.test.ts -x` | Wave 0 |

Note: The existing `src/__tests__/terminal/top-movers.test.ts` covers the backend `parseTopMoversResponse`. New tests are for the UI component and the `isMarketOpen` utility.

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/terminal/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/terminal/top-movers-panel.test.tsx` — covers TERM-01, TERM-02, TERM-03
- [ ] `src/__tests__/lib/market-hours.test.ts` — covers isMarketOpen MSK timezone logic

## Sources

### Primary (HIGH confidence)
- Source: direct code read — `src/server/actions/terminal-actions.ts` (getTopMoversAction shape confirmed)
- Source: direct code read — `src/core/types/terminal.ts` (TopMover type confirmed)
- Source: direct code read — `src/app/(dashboard)/terminal/page.tsx` (handleQuickSelect, layout, polling patterns)
- Source: direct code read — `src/components/terminal/positions-panel.tsx` (card pattern, skeleton, row pattern)
- Source: direct code read — `src/lib/terminal-utils.ts` (formatPrice, formatChange, getChangeColor)
- Source: direct code read — `src/server/providers/analytics/moex-provider.ts` (Redis TTL=60s confirmed)

### Secondary (MEDIUM confidence)
- MOEX trading hours (09:30–18:50 core session, pre-market from 09:50 for TQBR board) — standard public knowledge, aligns with CONTEXT.md spec of 09:50–18:50 MSK

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — all patterns are direct copies/adaptations of existing terminal panel code
- Pitfalls: HIGH — derived from reading actual code (polling pattern, skeleton gating, market hours edge cases)
- Market hours logic: MEDIUM — timezone math is standard but MSK day-of-week edge case needs test coverage

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable domain — no fast-moving dependencies)
