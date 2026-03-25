# Stack Research

**Domain:** AI trading platform — free-form dialog, portfolio analytics, terminal depth
**Researched:** 2026-03-25
**Confidence:** HIGH

## Context: Existing Stack (do not re-add)

Next.js 15, TypeScript, Tailwind, shadcn/ui, Supabase (auth only), Redis (ioredis),
lightweight-charts, simple-statistics, DeepSeek V3 via openai SDK (v6.31.0),
React Hook Form + Zod, Zustand, Vitest, react-markdown, framer-motion, sonner.

---

## Recommended Stack Additions

### Feature 1: AI Free-Form Dialog + Auto Parameter Extraction

**Verdict: No new packages needed. Extend existing DeepSeek provider.**

The existing `deepseek-provider.ts` already implements OpenAI function calling with `tools` +
`tool_choice: "auto"`. The `chatAboutStrategy` method already supports multi-turn dialog with
automatic `create_strategy` invocation when the AI decides it has enough context.

What needs to change is **scope**, not stack:
- Add new tool definitions alongside `create_strategy`: `create_signal`, `analyze_portfolio`
- Change the system prompt from quiz-guided (4 sequential questions) to free-form thinking
- Pass portfolio context and terminal analysis results into the messages array

The OpenAI SDK (already at v6.31.0) fully supports parallel tool calls and `tool_choice: "auto"`.
DeepSeek V3 supports OpenAI-compatible function calling. Confirmed working in production.

**Integration point:** `src/server/providers/ai/deepseek-provider.ts` — add tool definitions, update system prompts.

---

### Feature 2: Correlation Matrix Visualization

**Add: `@nivo/heatmap@0.99.0` + `@nivo/core@0.99.0`**

| Package | Version | Why |
|---------|---------|-----|
| `@nivo/heatmap` | 0.99.0 | The only production-ready React heatmap component with color scales, cell labels, tooltips, responsive wrapper. Planned in PROJECT.md Key Decisions. |
| `@nivo/core` | 0.99.0 | Peer dependency required by all nivo packages. |

Why nivo over alternatives:
- **Recharts**: Has no native heatmap component — would require building from scratch with SVG rects.
- **D3 directly**: 3x the code, no React integration, manual sizing.
- **react-heatmap-grid**: Abandoned, no TypeScript, no color scale.

The `ResponsiveHeatMap` component handles the correlation matrix data format natively:
```typescript
// Data shape nivo expects — matches what simple-statistics returns
{ id: "SBER", data: [{ x: "GAZP", y: 0.72 }, { x: "LKOH", y: 0.34 }] }
```

Correlation values computed with `simple-statistics` (already installed):
`sampleCorrelation(returnsA, returnsB)` — no additional math library needed.

**Integration point:** New component `src/components/portfolio/correlation-heatmap.tsx`.

---

### Feature 3: Markowitz Portfolio Optimization

**Verdict: Implement in-house using `simple-statistics` (already installed). No new package.**

The `portfolio-allocation` npm package (the only JS Markowitz library) is **abandoned** —
version 0.0.11, last published 5 years ago (confirmed via npm registry). Adding it introduces
a maintenance liability with no upside.

The math is self-contained and requires only:
1. Covariance matrix computation — use `sampleCovariance` from `simple-statistics`
2. Matrix inversion (3x3 to ~15x15 max for a typical portfolio) — implement as a pure function
3. Efficient frontier sampling — iterate lambda 0→1, solve closed-form MVO equations

The implementation fits in one file under 150 lines. The formula:

```
w* = argmin(wT * Σ * w) subject to wT * μ = target_return, wT * 1 = 1
```

Solved via Lagrangian multipliers — pure arithmetic, no quadratic solver needed for the
closed-form global minimum variance portfolio. For full frontier: parametric sweep over
target returns.

The result feeds a scatter chart (efficient frontier curve) — see sector allocation below
for the chart library.

**Integration point:** New service `src/server/services/markowitz-optimizer.ts`.

---

### Feature 4: Sector Allocation Charts

**Add: `recharts@3.8.1`**

| Package | Version | Why |
|---------|---------|-----|
| `recharts` | 3.8.1 | PieChart, Treemap, and scatter plot (for Markowitz efficient frontier curve) in one library. React-native, TypeScript-first, actively maintained, composable API. |

Why recharts over alternatives:
- **@nivo/pie**: Would work, but adds another nivo package for one chart type. recharts covers
  both pie AND the Markowitz frontier scatter plot — fewer packages total.
- **Victory**: Heavier bundle, less community adoption in 2025.
- **Chart.js + react-chartjs-2**: Non-React architecture, config-object API is harder to type safely.

Recharts components needed:
- `<PieChart>` / `<Pie>` — sector allocation donut
- `<Treemap>` — cohort breakdown by sector/type
- `<ScatterChart>` — Markowitz efficient frontier
- `<BarChart>` — cohort P&L comparison

**Integration point:** New components under `src/components/portfolio/`.

---

### Feature 5: Top Movers (Terminal)

**Verdict: Already fully implemented. Zero new packages needed.**

`src/server/providers/analytics/moex-provider.ts` already implements `getTopMovers()`:
- Fetches `TQBR` board securities with `LASTCHANGEPRCNT`, `LAST`, `VOLTODAY`, `HIGH`, `LOW`
- Filters nulls, sorts by change percent, returns `{ gainers: TopMover[], losers: TopMover[] }`
- Redis cache with 60-second TTL
- `TopMover` type declared in `core/types/terminal.ts`

The terminal action and UI component are not yet built, but the provider and types are ready.
No backend work needed beyond a Server Action calling `moex.getTopMovers()`.

---

## Installation

```bash
# Visualization (correlation heatmap + sector/cohort/frontier charts)
npm install @nivo/heatmap@0.99.0 @nivo/core@0.99.0 recharts@3.8.1
```

That is the complete list. All other features extend existing infrastructure.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@nivo/heatmap` | `react-heatmap-grid` | Abandoned, no TS types, no color scales |
| `@nivo/heatmap` | D3 custom | 3x code, no responsive wrapper, manual lifecycle |
| `recharts` | `@nivo/pie` + `@nivo/scatterplot` | More packages for fewer chart types |
| `recharts` | Victory | Heavier bundle, less adoption |
| Custom Markowitz | `portfolio-allocation` | Abandoned (last publish 2020, v0.0.11) |
| Custom Markowitz | MOSEK/convex solvers | Server-side only, license cost, overkill for 15 assets |
| Existing openai SDK | langchain / vercel AI SDK | Adds 50-200KB, wraps what we already use directly |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `portfolio-allocation` | Abandoned 5 years, v0.0.11, no TS | Custom math with `simple-statistics` |
| `mathjs` | 800KB bundle for matrix math | Inline matrix inversion (< 50 lines for n≤20) |
| `@vercel/ai` | Wraps OpenAI SDK we already use directly, adds abstraction with no benefit | `openai` SDK already installed |
| `@nivo/scatterplot` | Would need it only for Markowitz frontier | `recharts` ScatterChart covers same use case |
| `d3` | Recharts and nivo already bundle D3 internally | Use recharts/nivo components |

---

## Stack Patterns

**For AI tool calling (new tools):**
- Extend `generateStrategyTool` pattern in `deepseek-provider.ts`
- Use `tool_choice: "auto"` for free-form dialog (let AI decide when to invoke)
- Use `tool_choice: { type: "function", function: { name: "..." } }` for forced generation
- Pass tool result back as `{ role: "tool", content: ..., tool_call_id: ... }` in messages array

**For correlation computation (server-side):**
- Pull historical returns from T-Invest candles (already in broker provider)
- Compute pairwise with `simple-statistics.sampleCorrelation()`
- Cache in Redis with 1-hour TTL (data does not change intraday significantly)

**For Markowitz (server-side):**
- Compute in Server Action, not client-side (matrix algebra is CPU-bound but tiny for ≤20 assets)
- Return `{ weights: Record<string, number>, expectedReturn: number, volatility: number, sharpe: number }[]` for frontier points
- Cache per userId+portfolio with 1-hour TTL

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|----------------|-------|
| `@nivo/heatmap@0.99.0` | React 19 | Confirmed — nivo 0.99 targets React 18+, React 19 compatible |
| `recharts@3.8.1` | React 19 | recharts v3 explicitly supports React 18/19 |
| `@nivo/core@0.99.0` | `@nivo/heatmap@0.99.0` | Must match exactly — all nivo packages use the same version |

---

## Sources

- MOEX ISS endpoint confirmed via live fetch: `sort_column=LASTTOPREVPRICE` works, returns `LASTCHANGEPRCNT` — MEDIUM confidence (live API, no official docs for sort params)
- `portfolio-allocation` npm: v0.0.11, last published ~2020, confirmed abandoned — HIGH confidence
- `@nivo/heatmap` v0.99.0: confirmed via `npm show` — HIGH confidence
- `recharts` v3.8.1: confirmed via `npm show` — HIGH confidence
- OpenAI function calling with `tool_choice: "auto"`: verified in existing `deepseek-provider.ts` production code — HIGH confidence
- Top movers already implemented: verified in `moex-provider.ts` lines 63–84 — HIGH confidence

---

*Stack research for: AculaTrade v1.1 — AI Revolution + Deep Analytics*
*Researched: 2026-03-25*
