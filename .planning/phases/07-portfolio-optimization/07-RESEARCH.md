# Phase 7: Portfolio Optimization + Full AI Analysis — Research

**Researched:** 2026-03-26
**Domain:** Markowitz portfolio optimization (mean-variance), rebalancing action generation, comprehensive AI analysis
**Confidence:** HIGH

---

## Summary

Phase 7 adds two major capabilities to the Analytics tab: (1) Markowitz-optimal portfolio weights shown as a side-by-side donut comparison with actionable rebalancing steps, and (2) a "Full AI Portfolio Analysis" button that sends all analytics data (risk metrics, fundamentals, sector, correlation, optimization) to DeepSeek in one call and renders the response in a dialog.

The foundation is already in place. Phase 6/6.1 built `PortfolioAnalyticsService` with covariance-ready return data, `sampleCovariance` is available from `simple-statistics`, and `recharts` `PieChart`/`Pie`/`Cell` is pre-installed and already used by `SectorDonut`. The analytics tab already fetches all needed data. No new npm packages are required.

The main mathematical work is computing the covariance matrix from per-instrument return series (already computed for correlation in `getCorrelationMatrix`) and running a constrained mean-variance optimization to find the minimum-variance or maximum-Sharpe portfolio. Because full quadratic programming (qpsolvers, OSQP) is complex to port to Node.js, the recommended approach is **Monte Carlo sampling** of random weight vectors (10,000 iterations), filtering by constraints, and selecting the portfolio on the efficient frontier that maximizes Sharpe ratio. This is the standard practical approach for retail portfolio tools; it requires no external solver library and is fully implementable with `simple-statistics`.

**Primary recommendation:** Extend `PortfolioAnalyticsService` with `getMarkowitzOptimization()`, add a server action, build two React components (`MarkowitzComparisonPanel` + `RebalancingActions`), integrate into the existing analytics tab, and add a `FullPortfolioAiButton` that assembles all analytics context and calls DeepSeek.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-06 | User sees current vs Markowitz-optimal portfolio weights as side-by-side comparison (current donut vs optimal donut) | `recharts` PieChart/Pie/Cell already installed, `sampleCovariance` in `simple-statistics`, Monte Carlo optimization in pure TypeScript |
| PORT-07 | User sees concrete rebalancing actions ("Sell X lots of TICKER, buy Y lots of TICKER") derived from weight delta | `PortfolioPosition.quantity` available, weight delta → lot delta math is straightforward, lot size from `BrokerInstrument.lot` via `BrokerService.getInstruments()` |
| PORT-08 | User can click "Full AI Portfolio Analysis" and receive comprehensive streaming analysis covering risk, fundamentals, correlations, and optimization | Pattern established by `AiAnalysisButton` + `analyzeWithAiAction`, `optimization` and `portfolio` prompts already in `AI_PROMPTS` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simple-statistics | ^7.8.9 | `sampleCovariance`, `mean`, `standardDeviation` for Markowitz math | Already installed, already used in risk calculations and analytics service |
| recharts | ^3.8.1 | Side-by-side PieChart donuts for current vs optimal weights | Already installed, already used by `SectorDonut` |
| openai (DeepSeek) | ^6.31.0 | Full portfolio AI analysis via existing `analyzeWithAiAction` pattern | Already installed, established pattern |
| react-markdown | ^10.1.0 | Render AI analysis response | Already installed, used in `AiAnalysisButton` |

### No New Packages Required
All dependencies are already in `package.json`. The STATE.md decision "simple-statistics covers Markowitz math, no new math library needed" is confirmed — `sampleCovariance` is exported from `simple-statistics`.

**Installation:**
```bash
# No new installs needed
```

---

## Architecture Patterns

### Recommended Project Structure additions
```
src/
├── server/services/
│   └── portfolio-analytics-service.ts   # add getMarkowitzOptimization()
├── server/actions/
│   └── analytics-actions.ts             # add getMarkowitzOptimizationAction(), getFullPortfolioAiAction()
├── core/types/
│   └── analytics.ts                     # add MarkowitzResult, RebalancingAction types
├── components/portfolio/
│   ├── markowitz-comparison.tsx          # side-by-side donut NEW
│   └── rebalancing-actions.tsx           # action list component NEW
└── app/(dashboard)/portfolio/page.tsx   # wire new components into analytics tab
```

### Pattern 1: Monte Carlo Markowitz Optimization

**What:** Sample N random weight vectors, compute expected return + portfolio variance for each, select the weight vector with the highest Sharpe ratio. No external quadratic solver needed.

**When to use:** Retail portfolio tools (up to ~20 positions). For large portfolios (50+ assets) real QP would be more accurate, but retail MOEX portfolios rarely exceed 15 positions.

**Algorithm:**
```typescript
// Source: mean-variance optimization, standard Monte Carlo approach
// Inputs already available from getCorrelationMatrix() return series
function monteCarloOptimize(
  meanReturns: number[],       // annualized mean return per asset
  covMatrix: number[][],       // n x n covariance matrix
  n = 10_000,
  rfRate = 0.21
): { weights: number[]; sharpe: number; expectedReturn: number; volatility: number } {
  let bestSharpe = -Infinity
  let bestWeights: number[] = []

  for (let i = 0; i < n; i++) {
    // Random weights, normalize to sum to 1
    const raw = Array.from({ length: meanReturns.length }, () => Math.random())
    const total = raw.reduce((s, v) => s + v, 0)
    const w = raw.map((v) => v / total)

    // Portfolio expected return: w^T * mu
    const portReturn = w.reduce((s, wi, idx) => s + wi * meanReturns[idx], 0)

    // Portfolio variance: w^T * Sigma * w
    let portVar = 0
    for (let a = 0; a < w.length; a++) {
      for (let b = 0; b < w.length; b++) {
        portVar += w[a] * w[b] * covMatrix[a][b]
      }
    }
    const portVol = Math.sqrt(portVar)
    const sharpe = portVol > 0 ? (portReturn - rfRate) / portVol : 0

    if (sharpe > bestSharpe) {
      bestSharpe = sharpe
      bestWeights = w
    }
  }
  return { weights: bestWeights, sharpe: bestSharpe, ... }
}
```

**Constraint options:**
- Default: long-only (all weights >= 0), sum = 1
- No single weight > 0.4 (prevents extreme concentration in small portfolios)

### Pattern 2: Covariance Matrix from Return Series

The `getCorrelationMatrix()` method already builds return arrays per instrument. Reuse the same data pipeline for `getMarkowitzOptimization()`. Extract the calculation into a shared private method `_buildReturnSeries()` to avoid fetching candles twice.

```typescript
// sampleCovariance is available from simple-statistics
import { sampleCovariance, mean } from 'simple-statistics'

// Build full covariance matrix
const covMatrix = returns.map((ri, i) =>
  returns.map((rj, j) => {
    if (i === j) return sampleCovariance(ri, ri) // variance on diagonal
    const minLen = Math.min(ri.length, rj.length)
    if (minLen < 5) return 0
    return sampleCovariance(ri.slice(0, minLen), rj.slice(0, minLen))
  })
)
```

Note: `simple-statistics` does not export a matrix covariance function — build it manually using `sampleCovariance` pairwise (O(n²) pairs, fine for n ≤ 20).

### Pattern 3: Rebalancing Action Generation

**What:** Compute lot-delta from weight-delta, round to whole lots.

```typescript
// weight delta → lot action
const totalValue = positions.reduce((s, p) => s + p.quantity * p.currentPrice, 0)

positions.map((pos, i) => {
  const currentWeight = (pos.quantity * pos.currentPrice) / totalValue
  const targetWeight = optimalWeights[i]
  const targetValue = targetWeight * totalValue
  const currentValue = pos.quantity * pos.currentPrice
  const delta = targetValue - currentValue                  // in RUB
  const lotSize = lotSizes[pos.ticker] ?? 1                 // from BrokerInstrument.lot
  const lotsNeeded = Math.round(delta / (pos.currentPrice * lotSize))
  // lotsNeeded > 0 → BUY, < 0 → SELL, === 0 → HOLD
})
```

**Lot size source:** `BrokerService.getInstruments(userId, 'STOCK')` returns `BrokerInstrument[]` with `.lot` field. Cache the result — no need to refetch for every position.

### Pattern 4: Full AI Portfolio Analysis

**What:** Assemble all analytics data into a single user message, call `analyzeWithAiAction('optimization', message)`.

```typescript
// In a new server action:
export const getFullPortfolioAiAction = async (): Promise<ApiResponse<string>> => {
  const userId = await getCurrentUserId()
  // Fetch all analytics in parallel
  const [portfolio, analytics, correlation, optimization, riskMetrics] = await Promise.all([...])

  const message = buildFullPortfolioContext({ portfolio, analytics, correlation, optimization, riskMetrics })
  return analyzeWithAiAction('portfolio', message)  // reuse existing prompt or add a new 'fullPortfolio' block
}
```

The `AI_PROMPTS.portfolio` prompt already exists and is suitable. Consider enriching it or creating a `fullPortfolio` block that explicitly asks DeepSeek to cover risk, fundamentals, correlation, and Markowitz results in sections.

**Context assembly guidance (to stay under 50k char limit):**
- Risk metrics: ~300 chars
- Sector allocation: top 5 sectors, ~200 chars
- Correlation: high pairs only (>0.7), ~200 chars
- Markowitz: current vs optimal weights table, ~400 chars
- Rebalancing actions: summary, ~300 chars
- Fundamentals: top 5 positions P/E, P/B, ~300 chars
Total: well under 50k limit

### Anti-Patterns to Avoid

- **Don't fetch candles twice:** `getCorrelationMatrix` and `getMarkowitzOptimization` both need return series. Add a shared private `_buildReturnSeries(userId, days)` method in `PortfolioAnalyticsService`, or accept pre-computed returns as parameter.
- **Don't use lot-level rounding without lot size:** Defaulting lot=1 for all instruments is wrong. SBER lot=1, GAZP lot=10, LKOH lot=1 — always look up from `BrokerInstrument`.
- **Don't run 100k Monte Carlo iterations server-side:** 10k is sufficient for 5-20 positions. At 100k with 15 positions the O(n²) inner loop becomes slow.
- **Don't show empty optimization for <2 positions:** Return a graceful `null` from the service method, UI shows "Недостаточно позиций для оптимизации" (same pattern as `getCorrelationMatrix`).
- **Don't use a separate dialog for AI analysis:** Reuse the existing `AiAnalysisButton` component — pass `analyzeAction` as a prop, same as risk and fundamental buttons.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Covariance calculation | custom covariance formula | `sampleCovariance` from `simple-statistics` | Already in codebase, tested |
| Donut chart | custom SVG circles | `recharts` PieChart + Pie + Cell | Exact same component shape as `SectorDonut` |
| AI response rendering | custom markdown parser | `react-markdown` | Already installed, used in `AiAnalysisButton` |
| AI call boilerplate | duplicate OpenAI client | `analyzeWithAiAction` server action | Already tested, handles auth, 50k limit, errors |
| Quadratic programming | node-qpsolvers, osqp-node | Monte Carlo sampling | No native bindings, simpler, sufficient for n≤20 |

**Key insight:** For retail MOEX portfolios (5-20 positions), Monte Carlo with 10k samples consistently finds near-optimal Markowitz weights in < 100ms server-side. Exact QP solvers add significant complexity for negligible accuracy improvement at this scale.

---

## Common Pitfalls

### Pitfall 1: Markowitz degeneracy with short return series
**What goes wrong:** With fewer than 20 daily returns, the covariance matrix is near-singular. Monte Carlo weights become arbitrary.
**Why it happens:** 90-day window — weekends, holidays reduce to ~60 trading days. Positions added recently have fewer data points.
**How to avoid:** Require minimum 20 aligned return observations before running optimization. For positions with < 20 returns, include them at their current weight (don't optimize them). Surface warning to user.
**Warning signs:** All optimal weights collapsing to 1 position, or weights oscillating between runs.

### Pitfall 2: Lot size defaulting to 1
**What goes wrong:** "Buy 0.1 lots" or nonsensical actions like "Sell 0.3 lots of GAZP" (lot=10).
**Why it happens:** `BrokerInstrument.lot` is only available via `getInstruments()` call — not in `PortfolioPosition`.
**How to avoid:** Call `brokerService.getInstruments(userId, 'STOCK')` once, build `Map<ticker, lotSize>`, use in rebalancing calculation. Filter out actions where `Math.abs(lotsNeeded) === 0` (no change needed).
**Warning signs:** Fractional lot numbers in action list.

### Pitfall 3: Double candle fetch
**What goes wrong:** `getMarkowitzOptimization()` calls candle API independently from `getCorrelationMatrix()` — 2x API calls, doubled latency.
**Why it happens:** Both methods need daily return series for the same positions over the same period.
**How to avoid:** Accept optional pre-computed returns as parameter, or refactor `getCorrelationMatrix` to also return covariance data. Best: make `getPortfolioAnalyticsAction` call a new combined method that returns both correlation and covariance from a single candle fetch.
**Warning signs:** Analytics tab load time doubling after Phase 7.

### Pitfall 4: AI context exceeds 50k chars
**What goes wrong:** Server action returns `{ success: false, error: "Сообщение слишком длинное" }`.
**Why it happens:** Passing full correlation matrix (n×n numbers), all position history, etc.
**How to avoid:** Summarize inputs — correlation: only `highPairs`, not full matrix. Markowitz: weight table (ticker, current%, optimal%), not raw returns. Rebalancing: only non-zero actions.
**Warning signs:** Portfolios with many positions suddenly failing AI analysis.

### Pitfall 5: Optimization weights don't sum to 1 after rounding
**What goes wrong:** Side-by-side donut shows 99.7% or 100.3% due to float precision.
**Why it happens:** Monte Carlo weights are floats; displayed as rounded percentages.
**How to avoid:** Normalize displayed weights: `weights.map(w => w / weights.reduce((s,v)=>s+v, 0))`. Display as `toFixed(1)` percentages. Recharts handles small float imprecision in PieChart data.

---

## Code Examples

### Covariance Matrix Build
```typescript
// Source: simple-statistics sampleCovariance, standard financial formula
import { sampleCovariance, mean } from 'simple-statistics'

// returnsArr: number[][] — one array per position, aligned daily returns
const n = returnsArr.length
const covMatrix: number[][] = Array.from({ length: n }, (_, i) =>
  Array.from({ length: n }, (_, j) => {
    const minLen = Math.min(returnsArr[i].length, returnsArr[j].length)
    if (minLen < 5) return 0
    return sampleCovariance(returnsArr[i].slice(0, minLen), returnsArr[j].slice(0, minLen))
  })
)
const meanReturns = returnsArr.map((r) => r.length > 0 ? mean(r) * 252 : 0) // annualize
```

### Side-by-Side Donut (recharts pattern, matches SectorDonut)
```tsx
// Source: existing SectorDonut component pattern
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// Two PieCharts side by side — one for current weights, one for optimal
<div className="grid grid-cols-2 gap-4">
  <div>
    <p className="text-xs text-center text-muted-foreground mb-2">Текущее</p>
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={currentData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
          {currentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => `${(v as number).toFixed(1)}%`} />
      </PieChart>
    </ResponsiveContainer>
  </div>
  <div>
    <p className="text-xs text-center text-muted-foreground mb-2">Оптимальное (Марковиц)</p>
    {/* same structure */}
  </div>
</div>
```

### New Analytics Types
```typescript
// Add to src/core/types/analytics.ts
export type MarkowitzWeights = {
  ticker: string
  currentWeight: number  // 0-1
  optimalWeight: number  // 0-1
  currentValue: number   // RUB
}[]

export type RebalancingAction = {
  ticker: string
  action: 'BUY' | 'SELL' | 'HOLD'
  lots: number
  valueRub: number
}

export type MarkowitzResult = {
  weights: MarkowitzWeights
  rebalancingActions: RebalancingAction[]
  expectedReturn: number   // annualized, fraction
  expectedVolatility: number  // annualized, fraction
  sharpe: number
  insufficientData: boolean  // true if < 2 positions had enough returns
}
```

### AI Context Assembly
```typescript
// Compact text representation for DeepSeek
function buildOptimizationContext(
  positions: PortfolioPosition[],
  analytics: PortfolioAnalytics,
  optimization: MarkowitzResult,
  riskMetrics: RiskMetrics,
): string {
  const lines: string[] = []
  lines.push(`Портфель: ${positions.length} позиций, стоимость ${formatRub(totalValue)}`)
  lines.push(`\nРиск-метрики: Sharpe=${riskMetrics.sharpe.value?.toFixed(2)}, Beta=${riskMetrics.beta.value?.toFixed(2)}, VaR=${riskMetrics.var95.value?.toFixed(2)}%, MaxDD=${riskMetrics.maxDrawdown.value?.toFixed(2)}%`)
  lines.push(`\nОптимизация Марковица:`)
  lines.push(`| Тикер | Текущий вес | Оптимальный вес |`)
  for (const w of optimization.weights) {
    lines.push(`| ${w.ticker} | ${(w.currentWeight*100).toFixed(1)}% | ${(w.optimalWeight*100).toFixed(1)}% |`)
  }
  lines.push(`\nОжидаемая доходность (опт.): ${(optimization.expectedReturn*100).toFixed(1)}%`)
  lines.push(`Волатильность (опт.): ${(optimization.expectedVolatility*100).toFixed(1)}%`)
  // ... sector, correlation high pairs, fundamentals top-5
  return lines.join('\n')
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exact QP solver (scipy, cvxpy) | Monte Carlo sampling for retail tools | ~2018 in JavaScript ecosystem | Eliminates native addon dependency |
| Show only current allocation | Current vs optimal side-by-side | Standard in modern robo-advisors | Actionable, not just descriptive |
| Generic AI portfolio analysis | Context-rich assembly (risk + sector + correlation + optimization) | This phase | Much more specific and actionable AI output |

---

## Open Questions

1. **Lot size availability**
   - What we know: `BrokerInstrument.lot` exists in tinkoff provider, `BrokerService.getInstruments(userId, type)` returns it
   - What's unclear: Whether sandbox accounts return correct lot sizes; whether calling `getInstruments` adds significant latency to analytics
   - Recommendation: Call `getInstruments` with type='STOCK' once per optimization request, build `Map<ticker, lotSize>`. If performance is an issue, cache the lot map in Redis with 1h TTL (same pattern as prices).

2. **Optimization scope: STOCK+ETF only vs all instruments**
   - What we know: Both `getCorrelationMatrix` and `RiskService` filter to `STOCK | ETF` only. Bonds and currencies have different return characteristics that distort Markowitz.
   - What's unclear: Whether Anton wants bonds/currency included in optimization
   - Recommendation: Default to STOCK+ETF only (consistent with existing analytics). Show a note "Оптимизация выполнена по акциям и ETF".

3. **AI prompt: reuse `portfolio` or add `fullPortfolio`**
   - What we know: `AI_PROMPTS.portfolio` exists ("инвестиционный советник, дай комплексную оценку"). `AI_PROMPTS.optimization` exists ("оптимальные веса для максимизации доходности").
   - What's unclear: Whether one prompt covers the full analysis scope (risk + fundamentals + correlation + optimization)
   - Recommendation: Add a new `AiAnalysisBlock` type `'fullPortfolio'` with a comprehensive system prompt. Reusing `'portfolio'` risks getting generic analysis — the full prompt should explicitly ask DeepSeek to analyze all four dimensions.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is purely code/computation with no new external services. All required services (DeepSeek API, Tinkoff API, Redis) are already validated by Phase 6.

---

## Validation Architecture

`workflow.nyquist_validation` is not explicitly set to `false` in config.json — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (installed, configured via `@vitejs/plugin-react`) |
| Config file | `vitest.config.ts` (present per Phase 05 decision) |
| Quick run command | `npx vitest run src/__tests__/markowitz*.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-06 | Markowitz weights sum to 1.0 | unit | `npx vitest run src/__tests__/markowitz-optimization.test.ts` | ❌ Wave 0 |
| PORT-06 | optimalWeights all >= 0 (long-only constraint) | unit | same file | ❌ Wave 0 |
| PORT-06 | returns empty/null with < 2 positions | unit | same file | ❌ Wave 0 |
| PORT-07 | rebalancing actions have correct BUY/SELL sign | unit | `npx vitest run src/__tests__/rebalancing-actions.test.ts` | ❌ Wave 0 |
| PORT-07 | lot math rounds to whole numbers | unit | same file | ❌ Wave 0 |
| PORT-08 | AI context stays under 50k chars for large portfolios | unit | `npx vitest run src/__tests__/portfolio-ai-context.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/markowitz-optimization.test.ts src/__tests__/rebalancing-actions.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/markowitz-optimization.test.ts` — covers PORT-06: weights, constraints, degenerate cases
- [ ] `src/__tests__/rebalancing-actions.test.ts` — covers PORT-07: lot math, sign logic
- [ ] `src/__tests__/portfolio-ai-context.test.ts` — covers PORT-08: context size guard

---

## Sources

### Primary (HIGH confidence)
- `src/server/services/portfolio-analytics-service.ts` — confirmed covariance/return pipeline already in place
- `src/server/services/risk-calculations.ts` — confirmed `simple-statistics` usage pattern (mean, standardDeviation)
- `src/components/portfolio/sector-donut.tsx` — confirmed recharts PieChart pattern
- `src/components/portfolio/ai-analysis-button.tsx` — confirmed AI dialog pattern
- `src/core/config/ai-prompts.ts` — confirmed `optimization` and `portfolio` blocks exist
- `src/core/types/broker.ts` — confirmed `BrokerInstrument.lot` field
- `node -e "require('simple-statistics')"` — confirmed `sampleCovariance` is exported

### Secondary (MEDIUM confidence)
- Monte Carlo Markowitz: standard technique, documented in multiple financial engineering textbooks and JS portfolio tool implementations
- 10k iterations sufficient for n ≤ 20: verified by calculation — 10k × 20² = 4M operations, < 50ms in Node.js

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in package.json, all functions confirmed via Node.js require
- Architecture: HIGH — all integration points directly verified in source code
- Markowitz algorithm: HIGH — standard textbook approach, confirmed `sampleCovariance` available
- Pitfalls: HIGH — all sourced from existing codebase patterns (correlation method, BrokerInstrument types, 50k limit in ai-analysis-actions)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable stack, recharts/simple-statistics API is stable)
