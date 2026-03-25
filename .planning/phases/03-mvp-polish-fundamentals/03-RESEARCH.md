# Phase 3: MVP Polish + Fundamentals — Research

**Researched:** 2026-03-25
**Domain:** Next.js 15 App Router, React client components, DeepSeek AI, MOEX ISS fundamentals
**Confidence:** HIGH (all findings verified against existing codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Strategy Card & UX (POL-07, POL-08)**
- When `holdingQty === 0`, hide "portfolio size" / "currentAmount", show only realized P&L in ₽ and %
- Clear labels: "Результат" not ambiguous sum. Tooltips on conditions. Human-readable condition text.

**Terminal ↔ Strategies (POL-09)**
- "Создать стратегию" / "Создать сигнал" buttons in terminal page, pre-fill instrument, pass to strategy/signal creation page

**AI Chat Mode (POL-10)**
- Replace quiz with chat dialog. AiChat component already exists — it needs to become the primary creation flow, not a tab/alternative
- Flow: terminal AI analysis → "создай стратегию" → AI generates config → redirect to strategy page

**UI Polish (POL-01 through POL-06)**
- Portfolio summary block: total value from tradeAmounts, debit/credit, % growth
- All AI buttons → blue background (`bg-blue-600 hover:bg-blue-700 text-white`)
- Signal cleanTicker: @ suffix bug in signal creation actions (not applied at save time)
- Terminal sidebar: move to position #2 (after Dashboard, before Strategies)
- Chart timeframes: 1D PERIOD_CONFIG should show weeks of daily candles, not 1 day of 1-min data
- Terminal mobile: timeframe selector + AI button wrap, chart full width

**Fundamentals (INFR-02b, FUND-01 through FUND-05)**
- P/E, P/B source: MOEX ISS lacks these — use manual JSON mapping for top ~50 MOEX tickers as primary, smart-lab fallback is fragile
- FundamentalService fetches P/E, P/B, dividend yield per ticker
- Composite score 1-10 with weighted average
- Color coding: green=cheap, yellow=normal, red=expensive
- Fundamental card appears in portfolio position expand (PositionRow in portfolio-view.tsx)
- AI fundamental analysis button: DeepSeek evaluates multiples + price

### Claude's Discretion
- Exact ticker-to-fundamental mapping data (which 50 tickers, what values)
- Tooltip content text for strategy conditions
- Composite scoring weights (P/E, P/B, dividend yield weights)
- Mobile layout approach for terminal

### Deferred Ideas (OUT OF SCOPE)
- UXA-01 through UXA-05 (UX Audit with Playwright) — Phase 3.1, not Phase 3
- CORR-*, COHT-*, OPTM-* — Phase 4 and 5
- v2 requirements (TERM-01 through TERM-05, ADVN-*)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | Portfolio summary block — total portfolio value, debit/credit amounts, % growth/decline | `PortfolioView` already has summary cards; need to add debit/credit from `deposits` prop already passed in |
| POL-02 | AI analysis buttons → blue background | `AiAnalysisButton` already has `bg-blue-600` when `variant="default"` — check all usages for `variant="outline"` |
| POL-03 | Signal actions apply cleanTicker — no @ suffix in saved signals | `SignalService.createSignal` passes raw instrument, no cleanTicker call; fix in service or action |
| POL-04 | Terminal tab → second position in sidebar | `mainNav` array in `sidebar.tsx` — Terminal is already index 1 (after Dashboard) — VERIFY |
| POL-05 | Chart timeframes fix — 1D shows daily candles over weeks | `PERIOD_CONFIG["1d"]` = `{ days: 1, interval: "1d" }` — should be `{ days: 365, interval: "1d" }` |
| POL-06 | Terminal mobile responsiveness | terminal/page.tsx top area is `flex-wrap`; need to ensure small screen layout works properly |
| POL-07 | Strategy card: closed position shows only P&L | `strategy-card.tsx` line 256: conditional `holdingQty > 0 && initialAmount > 0` already guards `currentAmount` display — VERIFY bug |
| POL-08 | Strategy card UX — clear labels, tooltips | Needs `Tooltip` shadcn component (already installed: `tooltip.tsx`), condition text improvement |
| POL-09 | Terminal → Strategy/Signal creation buttons | `terminal/page.tsx` needs two buttons when `instrument` is selected, routing to `/strategies?instrument=TICKER` |
| POL-10 | AI chat mode — free-form chat for strategy creation | `AiChat` component exists and works; need to make it the default/primary creation method in `StrategyDialog` |
| INFR-02b | P/E, P/B data source | MOEX ISS confirmed no P/E, P/B fields; manual JSON mapping is the right approach |
| FUND-01 | FundamentalService — fetches P/E, P/B, dividend yield | New service class using static JSON + MOEXProvider.getDividends for dividend yield |
| FUND-02 | Composite scoring (1-10) | Pure calculation in FundamentalService; requires sector benchmarks |
| FUND-03 | Color indication per metric | Pure UI logic: green/yellow/red thresholds per metric type |
| FUND-04 | Fundamental card in portfolio position expand | Add to `PositionRow` in `portfolio-view.tsx` below the existing lots/operations sections |
| FUND-05 | AI fundamental analysis button | Reuse existing `AiAnalysisButton` with `block="fundamental"` + formatted fundamentals message |
</phase_requirements>

---

## Summary

Phase 3 is a mix of bug fixes, small UX improvements, and one non-trivial new feature (fundamentals data layer). The codebase is well-structured and most POL requirements are straightforward edits to existing files. The AI chat flow (POL-10) already exists as `AiChat` component — it just needs to become the primary (or sole) creation mode rather than a tab option inside `StrategyDialog`. The fundamentals feature (FUND-01 through FUND-05) is the most significant new work: it requires a static data file, a new service class, and UI expansion in the portfolio position row.

**Key insight:** POL-04 (sidebar position) appears to already be correct — Terminal is at index 1 in `mainNav`. This needs verification before treating it as work. POL-07 (closed position P&L display) also appears to be partially fixed in current code (`holdingQty > 0` guard exists) — the bug may be in how `currentAmount` is calculated upstream.

**Primary recommendation:** Work in the plan order from CONTEXT.md — fix bugs first (POL-07, POL-08), then terminal UX (POL-04, POL-05, POL-06, POL-09), then AI chat (POL-10, POL-01, POL-02, POL-03), then fundamentals data (INFR-02b, FUND-01, FUND-02), then fundamentals UI (FUND-03, FUND-04, FUND-05).

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| Next.js | 15+ | App Router, Server Actions | Project standard |
| shadcn/ui | latest | UI components including Tooltip, Popover | Project standard |
| Tailwind CSS v4 | latest | Styling | Project standard |
| Lucide | latest | Icons | Project standard |
| OpenAI SDK | latest | DeepSeek V3 via OpenAI-compatible API | Already used in ai-analysis-actions.ts |

### Already Installed shadcn Components Relevant to Phase 3
| Component | File | Used For |
|-----------|------|----------|
| Tooltip | `src/components/ui/tooltip.tsx` | POL-08: condition tooltips in strategy card |
| Popover | `src/components/ui/popover.tsx` | Already used in strategies page for filters |
| Badge | `src/components/ui/badge.tsx` | Strategy card status |
| Dialog | `src/components/ui/dialog.tsx` | StrategyDialog, AiAnalysisButton |

### No New npm Packages Required
All Phase 3 work uses existing dependencies. The fundamentals data will be a static JSON/TypeScript file, not a paid API.

---

## Architecture Patterns

### Recommended Project Structure Additions
```
src/
├── server/
│   └── services/
│       └── fundamental-service.ts    # NEW: FUND-01, FUND-02
├── core/
│   └── data/
│       └── fundamentals-map.ts       # NEW: INFR-02b — static P/E, P/B per ticker
└── components/
    └── portfolio/
        └── fundamental-card.tsx      # NEW: FUND-03, FUND-04 UI
```

### Pattern 1: Static Fundamentals Map (INFR-02b)
**What:** TypeScript file mapping ~50 MOEX tickers to P/E and P/B values, updated manually quarterly.
**When to use:** Phase 3 bootstrap. Values are sourced from smart-lab.ru or manual research at research time.
**Example:**
```typescript
// src/core/data/fundamentals-map.ts
export type FundamentalsEntry = {
  pe: number | null       // Price/Earnings — null if not applicable (ETF, loss-making)
  pb: number | null       // Price/Book
  sector: string          // for scoring benchmarks
  lastUpdated: string     // ISO date for staleness indicator
}

export const FUNDAMENTALS_MAP: Record<string, FundamentalsEntry> = {
  SBER:  { pe: 4.2,  pb: 0.9,  sector: "finance",  lastUpdated: "2026-03-01" },
  GAZP:  { pe: 3.1,  pb: 0.3,  sector: "energy",   lastUpdated: "2026-03-01" },
  LKOH:  { pe: 5.8,  pb: 0.9,  sector: "energy",   lastUpdated: "2026-03-01" },
  YNDX:  { pe: 22.0, pb: 3.1,  sector: "tech",     lastUpdated: "2026-03-01" },
  // ... ~46 more tickers
}
```

### Pattern 2: FundamentalService (FUND-01, FUND-02)
**What:** Service class that combines static P/E, P/B with live dividend yield from MOEXProvider.
**When to use:** Called from a new server action `getFundamentalsAction(ticker)`.
```typescript
// src/server/services/fundamental-service.ts
import { FUNDAMENTALS_MAP } from "@/core/data/fundamentals-map"
import { MOEXProvider } from "@/server/providers/analytics"

export type FundamentalMetrics = {
  pe: number | null
  pb: number | null
  dividendYield: number | null   // calculated from last 12m dividends / current price
  score: number                  // 1-10 composite
  scoreLabel: "cheap" | "fair" | "expensive"
  lastUpdated: string
}

export class FundamentalService {
  constructor(private moex = new MOEXProvider()) {}

  async getMetrics(ticker: string, currentPrice: number): Promise<FundamentalMetrics> { ... }
  calculateScore(pe: number | null, pb: number | null, dividendYield: number | null): number { ... }
}
```

### Pattern 3: FundamentalCard Component (FUND-03, FUND-04)
**What:** Client component rendered inside `PositionRow` expanded section.
**When to use:** When user expands a portfolio position.
```typescript
// src/components/portfolio/fundamental-card.tsx
type FundamentalCardProps = {
  ticker: string
  currentPrice: number
}
// Fetches via server action on first render, shows skeleton while loading
// Displays P/E, P/B, dividend yield with color coding
// Has AiAnalysisButton with block="fundamental"
```

### Pattern 4: Terminal Action Buttons (POL-09)
**What:** Two buttons added to `terminal/page.tsx` when instrument is selected — routing via Next.js `useRouter`.
**When to use:** Instrument is selected (`instrument !== null`).
```typescript
// Inside terminal/page.tsx, near the AiAnalysisButton:
import { useRouter } from "next/navigation"
const router = useRouter()

// In JSX when instrument is selected:
<Button size="sm" variant="outline" onClick={() => {
  router.push(`/strategies?createFor=${instrument.ticker}&type=${instrument.type}`)
}}>
  <Plus className="h-3.5 w-3.5 mr-1.5" />
  Создать стратегию
</Button>
<Button size="sm" variant="outline" onClick={() => {
  router.push(`/signals?createFor=${instrument.ticker}&type=${instrument.type}`)
}}>
  <Bell className="h-3.5 w-3.5 mr-1.5" />
  Создать сигнал
</Button>
```
The receiving pages (`StrategiesPage`, signals page) read `searchParams.createFor` and auto-open their dialogs with the instrument pre-filled.

### Pattern 5: AI Chat as Primary Creation Mode (POL-10)
**What:** `AiChat` component already exists and is functional. Need to restructure `StrategyDialog` so the AI chat tab is the default or the quiz/manual form is secondary.
**Current state:** `StrategyDialog` has tabs — "AI" and "Вручную". The AI tab shows `AiChat` when not editing.
**Required change:** When creating new strategy (not editing), show `AiChat` as the primary view. Keep "Вручную" as an alternate tab. This is a tab ordering/default change, not a rebuild.

### Anti-Patterns to Avoid
- **Fetching fundamentals on every portfolio refresh:** Use a server action that caches in Redis with a 24h TTL (same pattern as MOEXProvider).
- **Scraping smart-lab.ru at runtime:** Fragile, rate-limited, TOS risk. Use static data file instead.
- **Building custom tooltip:** shadcn `Tooltip` component is already installed — use it directly.
- **Duplicating AiAnalysisButton logic for fundamentals:** Re-use `AiAnalysisButton` with `analyzeAction` pointing to `analyzeWithAiAction("fundamental", formattedData)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Condition tooltips | Custom tooltip state management | shadcn `Tooltip` from `@/components/ui/tooltip` | Already installed, handles portal/accessibility |
| Fundamentals AI analysis | New streaming component | `AiAnalysisButton` with `analyzeAction` prop | Reusable component pattern already established |
| Terminal navigation to strategy | Custom form prefill mechanism | `useRouter().push` with query params + `useSearchParams` in receiving page | Standard Next.js pattern, minimal code |
| P/E, P/B data fetch | Scraping smart-lab at runtime | Static TypeScript map file | Reliable, zero latency, no rate limits |

---

## Critical Bugs to Verify

### POL-04 (Sidebar Order) — May Already Be Fixed
Current `mainNav` in `sidebar.tsx` (lines 31-38):
```
1. /dashboard — Рабочий стол
2. /terminal  — Терминал       ← already position 2
3. /strategies
4. /signals
5. /portfolio
6. /broker
7. /settings
```
Terminal is already at index 1 (position 2 after Dashboard). **POL-04 may be a no-op.** Verify against user's actual complaint.

### POL-05 (Timeframe Config) — Confirmed Bug
In `terminal/page.tsx` lines 27-34:
```typescript
const PERIOD_CONFIG: Record<ChartPeriod, { days: number; interval: string }> = {
  "1m": { days: 1,   interval: "1m" },
  "5m": { days: 3,   interval: "5m" },
  "15m":{ days: 7,   interval: "15m" },
  "1h": { days: 30,  interval: "1h" },
  "1d": { days: 365, interval: "1d" },   // ← CORRECT
  "1w": { days: 730, interval: "1w" },
}
```
The terminal page already has `1d = 365 days`. **POL-05 may already be fixed here.** The `ChartPeriodSelector` component and the same config in the portfolio page's position expand (if any) may still need checking.

### POL-07 (Closed Position Display) — Partially Fixed
In `strategy-card.tsx` lines 256-263:
```typescript
{stats.holdingQty > 0 && stats.initialAmount > 0 && (
  <span className={...}>
    {formatAmount(stats.currentAmount)} ₽
  </span>
)}
```
The `currentAmount` is guarded by `holdingQty > 0`. **The display guard is already correct.** The CONTEXT.md bug note describes `currentAmount = initialAmount + pnl = 19652 + (-28) = 19624` — this suggests the calculation in `operation-service.ts` or `operation-actions.ts` may be wrong. The bug is likely upstream in how `OperationStats.currentAmount` is calculated, not in the card display itself.

### POL-03 (Signal @ Suffix) — Confirmed Bug
`SignalService.createSignal` (line 38) passes raw `instrument` directly to repository without `cleanTicker`. The fix is to import and apply `cleanTicker` in `signal-actions.ts` before calling the service, or inside `SignalService.createSignal`. Pattern: same as how `strategy-checker.ts` applies `cleanTicker` at entry.

### POL-02 (AI Button Colors) — Partial Issue
`AiAnalysisButton` applies `bg-blue-600` only when `variant="default"`. The terminal page passes `variant="outline"`. This is the inconsistency. Fix: change terminal page call from `variant="outline"` to `variant="default"`, or audit all `AiAnalysisButton` usages.

---

## Common Pitfalls

### Pitfall 1: Tooltip in Strategy Card Overflow
**What goes wrong:** Adding `Tooltip` inside a card with `overflow-hidden` causes tooltips to be clipped.
**Why it happens:** The strategy card has `overflow-hidden` on the outer div (line 132).
**How to avoid:** Use `TooltipProvider` at page level, and ensure tooltip content uses `z-50`. shadcn Tooltip renders via portal — it will escape overflow in most cases, but verify on mobile.

### Pitfall 2: Fundamentals Data Staleness
**What goes wrong:** P/E values become misleading after quarterly earnings reports.
**Why it happens:** Static data file has no automatic update mechanism.
**How to avoid:** Add `lastUpdated` field to each entry and render a staleness warning in `FundamentalCard` when date is > 90 days old.

### Pitfall 3: Terminal createFor Query Param + Dialog Auto-Open
**What goes wrong:** Page reloads don't trigger dialog re-open; user loses context after navigation.
**Why it happens:** `useSearchParams` in `StrategiesPage` is not currently connected to dialog state.
**How to avoid:** In receiving page, read `searchParams.createFor` on mount via `useEffect`, if present → call `setDialogOpen(true)` and pre-populate instrument.

### Pitfall 4: AiChat "Replace Quiz" Misunderstanding
**What goes wrong:** Removing the manual form tab means editing existing strategies loses UI.
**Why it happens:** `StrategyDialog` uses tabs for create vs edit.
**How to avoid:** Only change the default tab and tab order for create mode. Edit mode must keep "Вручную" tab as primary. The `editStrategy` prop determines the mode.

### Pitfall 5: MOEXProvider Dividend Yield Calculation
**What goes wrong:** Dividend yield calculated from all-time dividends instead of trailing 12 months.
**Why it happens:** `getDividends` returns all historical dividends; naive sum gives inflated yield.
**How to avoid:** Filter dividends to last 12 months (`registryCloseDate` field in `DividendData`) before summing `value`, then divide by `currentPrice`.

---

## Code Examples

Verified patterns from existing codebase:

### Applying cleanTicker at Save (POL-03 fix)
```typescript
// src/server/actions/signal-actions.ts — add cleanTicker call
import { cleanTicker } from "@/lib/ticker-utils"

export const createSignalAction = async (data: { instrument: string; ... }) => {
  const cleaned = { ...data, instrument: cleanTicker(data.instrument) }
  const parsed = createSignalSchema.safeParse(cleaned)
  // ...
}
```

### Tooltip on Condition Label (POL-08)
```typescript
// src/components/ui/tooltip.tsx is already present
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// In StrategyCard conditions section:
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help underline decoration-dotted">{conditionSummary}</span>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-xs max-w-48">{humanReadableDescription}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Fundamentals Server Action Pattern
```typescript
// src/server/actions/fundamental-actions.ts
"use server"
import { FundamentalService } from "@/server/services/fundamental-service"
import { getCurrentUserId } from "./helpers"

export const getFundamentalsAction = async (
  ticker: string,
  currentPrice: number,
): Promise<ApiResponse<FundamentalMetrics>> => {
  try {
    await getCurrentUserId()
    const service = new FundamentalService()
    const metrics = await service.getMetrics(ticker, currentPrice)
    return successResponse(metrics)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
```

### Composite Score Calculation (FUND-02)
```typescript
// Sector-relative scoring: compare ticker's P/E to sector median
// Score ranges: 1-3 = cheap (green), 4-6 = fair (yellow), 7-10 = expensive (red)
const SECTOR_PE_MEDIANS: Record<string, number> = {
  finance: 6.0,
  energy: 5.5,
  tech: 18.0,
  metals: 7.0,
  retail: 12.0,
  default: 8.0,
}

calculateScore(pe: number | null, pb: number | null, dividendYield: number | null): number {
  let score = 5  // neutral baseline
  // P/E scoring relative to sector median
  // P/B scoring (< 1.0 = undervalued)
  // Dividend yield bonus (> 8% MOEX yield threshold)
  return Math.max(1, Math.min(10, Math.round(score)))
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| AiChat as optional tab | AiChat as default create mode | POL-10 change |
| Terminal at position 3 | Terminal at position 2 | Already done per sidebar.tsx |
| P/E from API | Static map + quarterly update | MOEX ISS limitation confirmed |

**Already correct (no change needed):**
- `PERIOD_CONFIG["1d"]` = 365 days in terminal/page.tsx — POL-05 may already be fixed
- Terminal sidebar position — already index 1
- `holdingQty > 0` guard on `currentAmount` display in strategy-card.tsx

---

## Open Questions

1. **POL-07 Exact Calculation Bug**
   - What we know: `currentAmount = initialAmount + pnl` shows wrong value for closed positions
   - What's unclear: The display guard exists. The bug is in `OperationStats.currentAmount` computation upstream in `operation-service.ts` — needs read to confirm
   - Recommendation: Read `operation-service.ts` `getOperationStats` method in Plan 01 before writing the fix

2. **POL-04 Sidebar Already Correct**
   - What we know: `mainNav` array has Terminal at index 1 (position 2)
   - What's unclear: Whether the user's complaint referred to a version that was since fixed, or a mobile-specific ordering
   - Recommendation: Check git log for sidebar.tsx changes; if already correct, mark POL-04 as no-op

3. **POL-05 Timeframe in Portfolio Expand**
   - What we know: Terminal page PERIOD_CONFIG is correct. The same `ChartPeriodSelector` pattern is used in portfolio position expand
   - What's unclear: Whether portfolio expand uses the same config or has its own
   - Recommendation: Check `portfolio-view.tsx` expanded section for chart rendering

4. **Fundamentals Map — Which 50 Tickers**
   - What we know: Need ~50 top MOEX tickers with P/E, P/B data as of research date
   - What's unclear: Current values for all tickers
   - Recommendation: Include top MOEX tickers by market cap: SBER, GAZP, LKOH, YNDX, NVTK, ROSN, GMKN, MTSS, ALRS, TCSG, VTBR, MGNT, PLZL, SNGS, CHMF, NLMK, MAGN, AFLT, PIKK, OZON, VKCO, FIXP, TATN, BSPB, RUAL + ~25 more

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is purely code changes. No new external services, databases, or CLI tools required. All dependencies (Redis, Supabase, T-Invest broker API, DeepSeek) are already integrated and running.

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from config.json → treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POL-03 | cleanTicker applied to signal instrument on save | unit | `npx vitest run src/__tests__/signal-service.test.ts -x` | ❌ Wave 0 |
| FUND-02 | Composite score 1-10 from P/E, P/B, dividend yield | unit | `npx vitest run src/__tests__/fundamental-service.test.ts -x` | ❌ Wave 0 |
| FUND-01 | getDividends + FUNDAMENTALS_MAP combined correctly | unit | `npx vitest run src/__tests__/fundamental-service.test.ts -x` | ❌ Wave 0 |
| POL-07 | OperationStats.currentAmount is 0 when holdingQty=0 | unit | `npx vitest run src/__tests__/operation-service.test.ts -x` | Partial — verify coverage |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/fundamental-service.test.ts` — covers FUND-01, FUND-02 score logic
- [ ] `src/__tests__/signal-service.test.ts` — covers POL-03 cleanTicker at save
- [ ] Verify `src/__tests__/operation-service.test.ts` covers closed position `currentAmount=0` case

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/components/strategy/strategy-card.tsx` — verified POL-07 guard and POL-08 state
- Codebase: `src/components/strategy/ai-chat.tsx` — verified POL-10 existing implementation
- Codebase: `src/components/layout/sidebar.tsx` — verified POL-04 current state
- Codebase: `src/app/(dashboard)/terminal/page.tsx` — verified POL-05, POL-06, POL-09
- Codebase: `src/server/providers/analytics/moex-provider.ts` — verified MOEX ISS capabilities (dividends available, P/E not)
- Codebase: `src/components/portfolio/portfolio-view.tsx` — verified FUND-04 target location
- Codebase: `src/components/portfolio/ai-analysis-button.tsx` — verified POL-02 variant handling
- Codebase: `src/core/config/ai-prompts.ts` — verified "fundamental" prompt block exists
- Codebase: `src/server/services/signal-service.ts` — confirmed POL-03 bug (no cleanTicker)

### Secondary (MEDIUM confidence)
- MOEX ISS API documentation (knowledge): Confirmed TQBR board does not expose P/E or P/B in securities.json or marketdata endpoints
- smart-lab.ru (knowledge): Provides P/E, P/B for MOEX stocks, but runtime scraping is unreliable

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing, verified against codebase
- Architecture: HIGH — patterns derived from existing codebase conventions
- Bug analysis: HIGH — bugs read directly from source code
- Pitfalls: MEDIUM — based on code reading and common Next.js/React patterns
- Fundamentals data values: LOW — specific P/E numbers require fresh research at plan time

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable codebase; fundamentals data values need refresh at implementation time)
