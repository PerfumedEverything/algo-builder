# Architecture Research

**Domain:** AculaTrade — AI Revolution + Deep Analytics (v1.1 milestone)
**Researched:** 2026-03-25
**Confidence:** HIGH — based on direct codebase inspection

---

## Context: What Already Exists

The codebase is a production platform, not a greenfield project. Every new feature must slot into the existing layer structure without breaking it.

```
Existing layers (do not restructure):
  Server Actions         → src/server/actions/
  Services (classes)     → src/server/services/
  Providers (classes)    → src/server/providers/
  Repositories           → src/server/repositories/
  Core types/config      → src/core/
  Components             → src/components/
```

Key existing assets relevant to this milestone:
- `DeepSeekProvider.chatAboutStrategy()` — chat with `create_strategy` function call, step-quiz prompt in `CHAT_SYSTEM_PROMPT`
- `analyzeWithAiAction` — one-shot AI analysis (chart, risk, fundamental, lot, optimization, portfolio blocks in `AI_PROMPTS`)
- `MOEXProvider.getTopMovers()` — already implemented, Redis TTL 60s, returns `{ gainers, losers }`
- `getTopMoversAction` — already implemented in `terminal-actions.ts`
- `RiskService.calculate()` — uses `simple-statistics` + `BrokerService` + `MOEXProvider`
- `risk-calculations.ts` — exports `dailyReturns`, `beta`, `alignByDate`, `sampleCorrelation` available in `simple-statistics`
- `AiChat` component — current quiz-style chat in `strategy/ai-chat.tsx`

---

## System Overview (New Features Only)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                  │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  AiChat v2   │  TopMovers   │ Correlation  │  SectorAllocation      │
│  (free-form) │  Widget      │  Matrix      │  + Cohorts             │
│              │              │  (@nivo)     │  + Markowitz           │
└──────┬───────┴──────┬───────┴──────┬───────┴────────────┬───────────┘
       │              │              │                    │
┌──────▼──────────────▼──────────────▼────────────────────▼───────────┐
│                      Server Actions                                  │
│  chatStrategyAction   getTopMoversAction   portfolio-analytics-      │
│  (modified)           (exists — expose     actions.ts (NEW)          │
│  analyzeWithAiAction  to terminal UI)                                │
└──────┬──────────────────────────┬─────────────────────────┬──────────┘
       │                          │                         │
┌──────▼──────┐    ┌──────────────▼──────┐   ┌─────────────▼──────────┐
│ DeepSeek    │    │  MOEXProvider        │   │ PortfolioAnalytics     │
│ Provider    │    │  (exists)            │   │ Service (NEW)          │
│ (modified)  │    │  getTopMovers() ✓    │   │ correlation()          │
│             │    │  getSectorInfo() NEW │   │ sectorAllocation()     │
│             │    │                      │   │ markowitz()            │
│             │    │                      │   │ cohorts()              │
└─────────────┘    └──────────────────────┘   └────────────────────────┘
```

---

## Feature 1: AI Free-Form Dialog

### Problem with Current Architecture

`CHAT_SYSTEM_PROMPT` in `deepseek-provider.ts` enforces a rigid 4-step quiz (instrument → style → risk → generate). This prevents natural conversation where a user says "Я хочу торговать Сбером агрессивно по скальпингу" and the AI should immediately call `create_strategy`.

### Solution: Replace Quiz Prompt, Add Context Injection

**What to modify:** Only `CHAT_SYSTEM_PROMPT` in `deepseek-provider.ts`.
**What NOT to change:** `chatAboutStrategy()` method signature, `AiChatMessage[]` type, `AiChatResponse` type, `chatStrategyAction` server action.

New prompt strategy — free-form reasoning mode:

```
CHAT_SYSTEM_PROMPT (new):
- You are a trading strategist thinking alongside the user
- Extract params from ANY message, no fixed question order
- If you have enough info (instrument + style OR indicator), call create_strategy immediately
- If missing critical info (no instrument at all), ask ONE clarifying question
- Continue dialog after strategy creation for refinement
- Support "сделай рискованнее", "измени таймфрейм на 1h" commands to modify last strategy
```

**Key change:** Remove the numbered quiz steps. The model already has `create_strategy` tool available and will call it opportunistically — the only barrier is the prescriptive prompt forcing sequential steps.

**AiChatMessage stays unchanged** — no migration needed, chat history is stateless per call.

### Terminal AI → Strategy Context Pass

The `analyzeWithAiAction` (chart/fundamental block) returns a markdown string. To pass this as context to strategy creation:

**Pattern:** Pass analysis context as the first user message or as a system context injection.

```typescript
// New field in AiChatMessage (non-breaking addition):
type AiChatMessage = {
  role: "user" | "assistant" | "system"  // add "system" support
  content: string
}

// AiChat component gets optional prop:
type AiChatProps = {
  onGenerated: (strategy: AiGeneratedStrategy) => void
  initialContext?: string  // pre-filled analysis from Terminal
}
```

When Terminal's "Создать стратегию" button is clicked after AI analysis:
1. Navigate to strategies page (or open modal) with `initialContext` = the analysis markdown
2. `AiChat` initializes with a synthetic system/user message: `"Вот анализ инструмента: [markdown]. Создай стратегию на его основе."`
3. DeepSeek reads context and calls `create_strategy` on first turn without quiz

**No new server action needed.** Uses existing `chatStrategyAction` with pre-seeded message history.

---

## Feature 2: Terminal Top Movers Widget

### Status: Already Implemented at Server Level

`MOEXProvider.getTopMovers()` and `getTopMoversAction()` are both complete. Only the UI component is missing.

### What to Build

New component: `src/components/terminal/top-movers-widget.tsx`

```
TopMoversWidget
  ├── Tabs: "Лидеры роста" / "Лидеры падения"
  ├── Polls getTopMoversAction() on mount + setInterval 60s
  ├── Renders TopMover[] rows (ticker, shortName, price, changePct badge, volume)
  └── Click on row → navigate to terminal with that ticker pre-selected
```

**Polling vs SSE:** Use polling (setInterval 60s). Rationale:
- MOEX ISS does not provide WebSocket for market data snapshots
- Redis TTL is already 60s — SSE would serve stale data at same frequency
- SSE adds infrastructure complexity for no benefit at this data freshness level
- Pattern consistent with existing portfolio polling (10s interval in portfolio page)

**Integration point:** Add `TopMoversWidget` to terminal page layout alongside order book / positions panels. No changes to `terminal-actions.ts` needed.

---

## Feature 3: Portfolio Analytics Services

### New Service: `PortfolioAnalyticsService`

Location: `src/server/services/portfolio-analytics-service.ts`

This service follows the same pattern as `RiskService` — receives `userId`, calls `BrokerService` for positions + candles, calls `MOEXProvider` for sector data, runs calculations, returns typed results.

```typescript
export class PortfolioAnalyticsService {
  private broker = new BrokerService()
  private moex = new MOEXProvider()

  async getCorrelationMatrix(userId: string): Promise<CorrelationMatrix>
  async getSectorAllocation(userId: string): Promise<SectorAllocation[]>
  async getCohorts(userId: string): Promise<CohortAnalysis>
  async getMarkowitzOptimization(userId: string): Promise<MarkowitzResult>
}
```

Split into separate files to respect the 150-line limit:

```
src/server/services/
  portfolio-analytics-service.ts     ← orchestration (calls sub-calculators)
  correlation-calculator.ts          ← sampleCorrelation from simple-statistics
  sector-calculator.ts               ← sector grouping + weight calculations
  markowitz-calculator.ts            ← efficient frontier math
  cohort-calculator.ts               ← grouping positions by result/sector/type
```

### Correlation Matrix

**Data source:** `BrokerService.getCandles()` for each position (same as `RiskService`).
**Math:** `simple-statistics.sampleCorrelation(a, b)` — already available in installed package (confirmed: exports `sampleCorrelation`).
**Output type:**

```typescript
export type CorrelationMatrix = {
  tickers: string[]
  matrix: number[][]   // [i][j] = correlation between tickers[i] and tickers[j]
  calculatedAt: string
}
```

**Visualization:** `@nivo/heatmap` — listed in PROJECT.md constraints, install via `npm install @nivo/heatmap`. The `ResponsiveHeatMap` component takes `data` array with `id` + `data[{x, y}]` structure.

**Caching:** Redis key `portfolio:correlation:{userId}`, TTL 3600s (1 hour). Same pattern as risk metrics.

### Sector Allocation

**Data source:** MOEX ISS `/iss/cci/info/companies/industry-codes` endpoint — returns industry codes per company. Map SECID → sector name.

**Caching strategy:**
- Sector mappings: Redis key `moex:sectors:map`, TTL 86400s (24h) — sector classifications change rarely
- Portfolio allocation: computed on the fly from cached sector map + live positions

**Output type:**

```typescript
export type SectorAllocation = {
  sector: string
  weight: number       // % of portfolio
  value: number        // in rubles
  tickers: string[]
  pnlPct: number       // sector-level P&L %
}
```

**Add to MOEXProvider:** New method `getSectorMap(): Promise<Record<string, string>>` — fetches SECID → industry name mapping. Keep `AnalyticsProvider` interface minimal; sector map is an implementation detail.

### Markowitz Optimization

**Math:** Efficient frontier via mean-variance optimization. `simple-statistics` has no matrix inversion, so implement manually:
- Expected returns: mean of daily returns per position (annualized)
- Covariance matrix: `sampleCovariance(a, b)` from `simple-statistics` (confirmed available)
- Minimum variance portfolio: gradient descent or closed-form for N ≤ 20 positions
- Output: suggested weights + expected Sharpe improvement

**Package decision:** Do NOT add `mathjs` or `numeric` — keep `simple-statistics` as sole math dependency. The portfolio sizes (< 20 positions typical) make manual matrix operations feasible within 150 lines.

**Output type:**

```typescript
export type MarkowitzResult = {
  currentWeights: PositionWeight[]
  suggestedWeights: PositionWeight[]
  currentSharpe: number
  expectedSharpe: number
  rebalanceActions: RebalanceAction[]
}
```

### Cohort Analysis

Grouping positions by:
- `sector` (from sector allocation)
- `instrumentType` (STOCK / BOND / ETF from broker data — already available)
- `result` (profitable / breakeven / loss buckets)

No external data needed — purely computed from existing `Portfolio.positions`.

**Output type:**

```typescript
export type CohortAnalysis = {
  bySector: CohortGroup[]
  byType: CohortGroup[]
  byResult: CohortGroup[]
}

export type CohortGroup = {
  label: string
  count: number
  totalValue: number
  pnlPct: number
  tickers: string[]
}
```

---

## New Server Action

Location: `src/server/actions/portfolio-analytics-actions.ts`

```typescript
export const getCorrelationMatrixAction = async (): Promise<ApiResponse<CorrelationMatrix>>
export const getSectorAllocationAction = async (): Promise<ApiResponse<SectorAllocation[]>>
export const getMarkowitzAction = async (): Promise<ApiResponse<MarkowitzResult>>
export const getCohortAnalysisAction = async (): Promise<ApiResponse<CohortAnalysis>>
```

Pattern: `await getCurrentUserId()` first, then `new PortfolioAnalyticsService().method(userId)`.

---

## Component Boundaries

| Component | Location | New or Modified | Communicates With |
|-----------|----------|-----------------|-------------------|
| `AiChat` | `components/strategy/ai-chat.tsx` | Modified: add `initialContext` prop, remove quiz prompt dependency | `chatStrategyAction` (unchanged) |
| `TopMoversWidget` | `components/terminal/top-movers-widget.tsx` | New | `getTopMoversAction` |
| `CorrelationHeatmap` | `components/portfolio/correlation-heatmap.tsx` | New | `getCorrelationMatrixAction`, `@nivo/heatmap` |
| `SectorAllocationChart` | `components/portfolio/sector-allocation-chart.tsx` | New | `getSectorAllocationAction` |
| `CohortTable` | `components/portfolio/cohort-table.tsx` | New | `getCohortAnalysisAction` |
| `MarkowitzPanel` | `components/portfolio/markowitz-panel.tsx` | New | `getMarkowitzAction` |
| `PortfolioDepthTab` | `components/broker/portfolio-view.tsx` | Modified: add "Аналитика" tab | All portfolio analytics actions |

---

## Data Flow

### Free-Form Chat → Strategy

```
User types natural text
    ↓
AiChat component (modified CHAT_SYSTEM_PROMPT)
    ↓ chatStrategyAction(messages)
DeepSeekProvider.chatAboutStrategy()
    ↓ opportunistic create_strategy tool call
AiChatResponse { message, strategy? }
    ↓
If strategy → StrategyPreview → Apply → createStrategyAction
```

### Terminal Analysis → Strategy (Context Bridge)

```
Terminal: AI analysis panel runs analyzeWithAiAction("chart", data)
    ↓ returns markdown string
User clicks "Создать стратегию на основе анализа"
    ↓ navigate to /strategies?context=encodedMarkdown
AiChat mounts with initialContext prop
    ↓ seeds messages: [{ role: "user", content: "Анализ: " + context + "\nСоздай стратегию" }]
DeepSeek reads context → calls create_strategy on turn 1
```

### Portfolio Correlation

```
Portfolio page "Аналитика" tab mounts
    ↓ getCorrelationMatrixAction()
    ↓ PortfolioAnalyticsService.getCorrelationMatrix(userId)
    ↓ Redis cache check → miss → BrokerService.getCandles() × N positions
    ↓ simple-statistics.sampleCorrelation() for each pair
    ↓ Redis.set(TTL 3600)
    ↓ CorrelationMatrix → CorrelationHeatmap (@nivo/heatmap)
```

### Sector Allocation

```
getSectorAllocationAction()
    ↓ PortfolioAnalyticsService.getSectorAllocation(userId)
    ↓ MOEXProvider.getSectorMap() → Redis cache 24h
    ↓ BrokerService.getPortfolio(userId) → existing cached portfolio
    ↓ Map position tickers → sectors → aggregate weights
    ↓ SectorAllocation[] → SectorAllocationChart (Recharts pie — already installed)
```

---

## Modified Files (Explicit List)

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/server/providers/ai/deepseek-provider.ts` | Modify | Replace `CHAT_SYSTEM_PROMPT` content only — free-form reasoning instead of 4-step quiz |
| `src/server/providers/ai/types.ts` | Modify | Add `"system"` to `AiChatMessage.role` union |
| `src/server/providers/analytics/moex-provider.ts` | Modify | Add `getSectorMap()` method |
| `src/server/providers/analytics/types.ts` | Modify | Add `getSectorMap()` to `AnalyticsProvider` interface |
| `src/components/strategy/ai-chat.tsx` | Modify | Add `initialContext?: string` prop, seed initial messages from context |
| `src/components/broker/portfolio-view.tsx` | Modify | Add "Аналитика" tab, mount portfolio analytics components |
| `src/app/(dashboard)/portfolio/page.tsx` | Modify | Pass through any query params for context (minor) |

---

## New Files (Explicit List)

| File | Purpose |
|------|---------|
| `src/server/services/portfolio-analytics-service.ts` | Orchestration: calls sub-calculators, handles caching |
| `src/server/services/correlation-calculator.ts` | Pearson correlation matrix from daily returns |
| `src/server/services/sector-calculator.ts` | Position → sector mapping + weight aggregation |
| `src/server/services/markowitz-calculator.ts` | Efficient frontier, min-variance weights |
| `src/server/services/cohort-calculator.ts` | Group positions by sector/type/result |
| `src/server/actions/portfolio-analytics-actions.ts` | Server actions for all 4 analytics endpoints |
| `src/core/types/portfolio-analytics.ts` | Types: CorrelationMatrix, SectorAllocation, MarkowitzResult, CohortAnalysis |
| `src/components/terminal/top-movers-widget.tsx` | Terminal top movers panel, 60s polling |
| `src/components/portfolio/correlation-heatmap.tsx` | @nivo/heatmap wrapper |
| `src/components/portfolio/sector-allocation-chart.tsx` | Recharts pie (already installed) |
| `src/components/portfolio/cohort-table.tsx` | Grouped positions table |
| `src/components/portfolio/markowitz-panel.tsx` | Weights comparison + rebalance actions |

---

## Build Order (Dependency Graph)

```
Phase 1 — Types & Calculations (no UI, no external deps)
  → src/core/types/portfolio-analytics.ts
  → src/server/services/correlation-calculator.ts
  → src/server/services/cohort-calculator.ts
  → src/server/services/sector-calculator.ts
  → src/server/services/markowitz-calculator.ts

Phase 2 — Provider & Service (depends on Phase 1 types)
  → src/server/providers/analytics/moex-provider.ts (add getSectorMap)
  → src/server/services/portfolio-analytics-service.ts

Phase 3 — Server Actions (depends on Phase 2)
  → src/server/actions/portfolio-analytics-actions.ts

Phase 4 — AI Changes (independent of Phases 1-3)
  → src/server/providers/ai/deepseek-provider.ts (replace CHAT_SYSTEM_PROMPT)
  → src/server/providers/ai/types.ts (add system role)
  → src/components/strategy/ai-chat.tsx (add initialContext prop)

Phase 5 — Terminal UI (depends on existing getTopMoversAction)
  → src/components/terminal/top-movers-widget.tsx

Phase 6 — Portfolio Analytics UI (depends on Phase 3)
  → npm install @nivo/heatmap
  → src/components/portfolio/correlation-heatmap.tsx
  → src/components/portfolio/sector-allocation-chart.tsx
  → src/components/portfolio/cohort-table.tsx
  → src/components/portfolio/markowitz-panel.tsx
  → src/components/broker/portfolio-view.tsx (add Аналитика tab)
```

---

## Scaling Considerations

| Concern | Current (prod) | Mitigation |
|---------|----------------|------------|
| Correlation matrix: N positions × N API calls for candles | ~10-20 positions typical → 10-20 calls | Batch existing pattern (3 at a time in RiskService) |
| MOEX sector map: cold start | 1 HTTP call, cached 24h | Acceptable |
| Markowitz: O(N²) covariance | N ≤ 30 in practice | No issue |
| Top movers: 60s polling per user session | 1 MOEX call per 60s, Redis cached | Fine |

---

## Anti-Patterns

### Anti-Pattern 1: Re-fetching candles for each analytics feature separately

**What people do:** `CorrelationService` fetches candles, `MarkowitzService` also fetches candles, `RiskService` already fetches candles — three separate sets of API calls.

**Why it's wrong:** T-Invest API has rate limits. Fetching year of daily candles for 20 positions 3 times = 60 calls per page load.

**Do this instead:** `PortfolioAnalyticsService` fetches candle data once and passes the returns arrays to all sub-calculators. If correlation and Markowitz are requested on the same page load, share the computation via a single candle fetch at the orchestration level.

### Anti-Pattern 2: Changing `chatStrategyAction` signature to add context

**What people do:** Add `context?: string` parameter to the server action, pass it through to DeepSeek.

**Why it's wrong:** The context should be part of the message history, not a side-channel parameter. DeepSeek models work best when context is in the conversation, not injected as system prompt additions at call time.

**Do this instead:** Seed the `AiChatMessage[]` history on the client with the context as a user message before the first call. The server action remains unchanged.

### Anti-Pattern 3: SSE for top movers

**What people do:** Create an SSE route `/api/stream/top-movers` to push updates.

**Why it's wrong:** MOEX ISS serves stale data updated every 60s during trading hours. SSE adds a persistent connection for no freshness benefit. Redis TTL already handles the rate limiting.

**Do this instead:** 60s `setInterval` polling of `getTopMoversAction()`, matching Redis TTL.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MOEX ISS `/cci/info/companies/industry-codes` | REST GET, parse columns/data arrays (same mapColumnsToObject pattern as existing endpoints) | Returns SECID + industry code; need second call to `/cci/reference/industry-codes` for human-readable sector names. Cache both separately. |
| DeepSeek API (existing) | No change to HTTP calls — only prompt content changes | Model: `deepseek-chat`, temperature 0.7 |
| @nivo/heatmap | npm install, client component only | No SSR issues if wrapped in dynamic import or mounted client-side |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `PortfolioAnalyticsService` → `BrokerService` | Direct class instantiation (same pattern as RiskService) | No DI container exists — follow existing pattern |
| `PortfolioAnalyticsService` → `MOEXProvider` | Direct class instantiation | |
| `AiChat` → `Terminal` context bridge | URL query param `?context=` + `useSearchParams()` in `AiChat` | Keep it simple — no Zustand store needed, context is one-time initialization |
| `portfolio-analytics-actions` → `services/index.ts` barrel | Add exports to barrel after creating files | Required by barrel export convention |

---

## Sources

- Codebase inspection: `src/server/providers/ai/deepseek-provider.ts`, `src/server/services/risk-service.ts`, `src/server/providers/analytics/moex-provider.ts`, `src/server/actions/terminal-actions.ts`, `src/components/strategy/ai-chat.tsx`
- `simple-statistics` v7.8.9 installed exports: `sampleCorrelation`, `sampleCovariance`, `sampleRankCorrelation` (confirmed via node inspection)
- MOEX ISS sector endpoints: `https://iss.moex.com/iss/reference/` — `/cci/info/companies/industry-codes`, `/cci/reference/industry-codes`
- `@nivo/heatmap` specified in PROJECT.md constraints as the chosen correlation visualization library
- Top movers: MOEX ISS `/engines/stock/markets/shares/boards/TQBR/securities.json` already implemented with 60s Redis TTL

---

*Architecture research for: AculaTrade v1.1 AI Revolution + Deep Analytics*
*Researched: 2026-03-25*
