# Feature Research

**Domain:** Algorithmic trading platform — AI-driven analytics, MOEX, Russian retail investors
**Researched:** 2026-03-25
**Confidence:** MEDIUM (MOEX-specific data sparse; core patterns verified from global trading platforms)

---

## Context: What Is Already Built

This is a subsequent milestone. The following features exist and are NOT in scope below:

- AI chat (quiz mode, function calling, strategy generation via DeepSeek V3)
- Terminal: lightweight-charts, order book, positions, trade history
- Portfolio: positions table, P&L, risk metrics (Sharpe/Beta/VaR/MaxDD/Alpha), fundamental analysis
- Strategy/signal pipeline with indicator checks (SMA, EMA, RSI, MACD, Bollinger, Volume)
- TopMover type declared + `parseTopMoversResponse` implemented, MOEX provider has `getTopMovers()` — component not yet rendered

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Top Movers widget (gainers/losers) | Every trading terminal shows this — CNBC, TradingView, Benzinga, Morningstar all have it as first-screen content | LOW | Backend fully ready (`getTopMovers`, `parseTopMoversResponse`, `TopMover` type). Only UI component missing. |
| Sector allocation chart | Every portfolio tool from T-Invest to TradingView shows sector breakdown | MEDIUM | `sector` field already in `fundamentals-map.ts` (finance, energy, metals, tech, telecom, retail, utilities, etc). Build from existing data. |
| Correlation matrix between portfolio assets | Standard in professional platforms (PortfolioVisualizer, OANDA Labs, Bloomberg). Users expect diversification view | MEDIUM | Pearson correlation on price returns via `simple-statistics`. `@nivo/heatmap` already in constraints. |
| AI free-form strategy dialog | Composer.trade, Capitalise.ai, TrendSpider — all offer natural language strategy input. Quiz mode is explicitly blocking according to Anton feedback | HIGH | Existing `chatStrategyAction` + function calling infra is the right base. Need to remove quiz gating and switch to open conversation with `extract_strategy` tool call. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Strategy/signal creation from AI analysis context | "You just analyzed SBER chart as bullish — create a strategy?" — closes the loop from analysis to action. No platform does this inline. | MEDIUM | AI analysis buttons already exist (`ai-analysis-actions.ts`). Add "Create Strategy" CTA to AI response rendering. Passes ticker + analysis context to AI chat. |
| Markowitz portfolio optimization with rebalancing recommendation | PortfolioVisualizer exists but is not integrated. T-Invest has nothing like this. Showing efficient frontier + rebalancing delta is genuinely advanced. | HIGH | `simple-statistics` has the math primitives. Needs historical price fetching per position ticker from MOEX ISS. Existing `getHistoryWithPagination` can serve this. |
| Cohort analysis: positions grouped by sector/type/result | No Russian retail broker offers this. Group by sector (profitable vs losing sectors), by trade duration, by P&L range. | MEDIUM | `sector` data available via `fundamentals-map.ts`. Need groupBy logic in portfolio service + UI table/chart. |
| Full AI portfolio analysis (all metrics + narrative) | AI prompt `portfolio` and `optimization` already defined in `ai-prompts.ts`. One button that sends all metrics, allocations, correlations and gets holistic advice. | LOW | Mostly prompt + data assembly. Highest-value feature for lowest build cost. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time correlation updates (WebSocket) | Users expect live data | Pearson correlation on intraday prices is noisy and misleading. Daily returns correlation is what practitioners use. | Recompute on page open + cache 1 hour in Redis. |
| Efficient frontier interactive scatter plot | Looks impressive in demos | Requires per-asset Monte Carlo simulation — expensive compute, unclear value for MOEX retail traders with 5-20 positions | Show optimal weights as a before/after bar chart instead. Simple, actionable. |
| Streaming AI responses (token-by-token SSE) | Chat feels faster | Existing `chatStrategyAction` uses Server Actions — switching to SSE requires new API route, complex state management, more error surface | Keep current approach: loading spinner, full response on completion. Fast enough with DeepSeek V3. |
| AI strategy backtesting inline in chat | Natural follow-up to strategy creation | Backtest engine is a full milestone on its own (session 26 plan). Scope creep. | Show indicator signals on chart as markers (already possible with lightweight-charts). |
| Pine Script / code editor for strategies | Power users ask for this | Out of scope per PROJECT.md — future milestone | Stick to no-code visual + AI generation approach. |

---

## Feature Dependencies

```
[Top Movers Widget]
    no dependencies — backend fully ready

[Sector Allocation Chart]
    uses──> fundamentals-map.ts (sector field, already populated)
    uses──> portfolio positions (already available)

[Correlation Matrix]
    requires──> historical price data per ticker (MOEX ISS history endpoint)
    uses──> getHistoryWithPagination (already built in MOEXProvider)
    uses──> simple-statistics Pearson correlation
    uses──> @nivo/heatmap (in package constraints)

[Markowitz Optimization]
    requires──> Correlation Matrix (same historical price data)
    requires──> portfolio positions with weights
    uses──> simple-statistics (mean, variance, covariance)
    enhances──> Sector Allocation (shows rebalancing across sectors)

[Cohort Analysis]
    uses──> fundamentals-map.ts (sector)
    uses──> portfolio positions + trade history (already available)
    no new data dependencies

[AI Free-Form Dialog]
    replaces──> quiz-gated chatStrategyAction (same action, different prompt)
    uses──> DeepSeek V3 function calling (already working)
    enhances──> AI analysis buttons (add "create strategy/signal" CTA)

[Strategy/Signal from Analysis Context]
    requires──> AI Free-Form Dialog (needs open chat mode)
    uses──> existing terminal AI analysis (chart, fundamental)

[Full AI Portfolio Analysis]
    requires──> Correlation Matrix (to include in prompt)
    requires──> Sector Allocation (to include in prompt)
    uses──> existing ai-prompts.ts `portfolio` and `optimization` prompts
```

### Dependency Notes

- **Correlation Matrix requires Markowitz**: Both need per-ticker historical returns. Build historical data fetching once, share across both features.
- **AI Free-Form Dialog is independent**: Does not require portfolio analytics features. Can ship first.
- **Top Movers is standalone**: Zero new data dependencies. Quickest win.
- **Full AI Portfolio Analysis depends on correlation + sector data**: Should be last in the analytics group — it synthesizes everything.

---

## MVP Definition

This is milestone v1.1 — "AI Revolution + Deep Analytics". Scope is fixed per PROJECT.md.

### Launch With (this milestone)

- [ ] Top Movers widget in terminal — quickest win, backend ready
- [ ] AI free-form strategy dialog — highest user-facing impact, Anton's #1 request
- [ ] Sector allocation chart — donut/bar, uses existing `sector` data
- [ ] Correlation matrix — @nivo/heatmap, Pearson on daily returns
- [ ] Cohort analysis — groupBy sector/type/result in portfolio
- [ ] Markowitz optimization — optimal weights + rebalancing delta
- [ ] Strategy/signal from AI analysis context — closes analysis→action loop
- [ ] Full AI portfolio analysis button — low cost, high value

### Add After Validation (v1.2+)

- [ ] Top Movers volume filter (show by volume surge, not just % change) — trigger: users ask for it
- [ ] Correlation matrix for watchlist tickers (not just portfolio) — trigger: users with small portfolios want wider view
- [ ] Historical correlation (rolling 30/90 day) — trigger: power user requests

### Future Consideration (v2+)

- [ ] Backtest engine — full milestone, per session 26 plan
- [ ] Pine Script / scripted strategies — out of scope per PROJECT.md
- [ ] News constructor — out of scope per PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Top Movers widget | HIGH | LOW (backend done) | P1 |
| AI free-form dialog | HIGH | MEDIUM (refactor prompt + remove quiz gate) | P1 |
| Sector allocation chart | HIGH | LOW-MEDIUM (data exists) | P1 |
| Strategy from analysis context | HIGH | LOW (add CTA to existing AI output) | P1 |
| Correlation matrix | MEDIUM | MEDIUM (historical fetch + nivo/heatmap) | P2 |
| Cohort analysis | MEDIUM | MEDIUM (groupBy logic + UI) | P2 |
| Full AI portfolio analysis | HIGH | LOW (data assembly + existing prompts) | P1 |
| Markowitz optimization | MEDIUM | HIGH (math + UI + historical data) | P2 |

---

## Competitor Feature Analysis

| Feature | TradingView | T-Invest (Tinkoff) | PortfolioVisualizer | AculaTrade Approach |
|---------|-------------|-------------------|---------------------|---------------------|
| Top Movers | Full page, real-time, filters by market | Basic gainers/losers list | N/A | Top 5 gainers + losers in terminal panel, MOEX TQBR board, 60s Redis cache |
| AI strategy creation | Pine Script only (code), no NLP | None | None | Free-form dialog → DeepSeek function calling → auto-fill strategy form |
| Correlation matrix | Available as Pine Script indicator for charts | None | Full matrix with time period selector | @nivo/heatmap on portfolio positions, daily returns, configurable period |
| Sector allocation | None in portfolio view | Pie chart, no drill-down | Bar chart by asset class | Donut chart + table with sector P&L breakdown |
| Markowitz optimization | None | None | Full efficient frontier + Monte Carlo | Simplified: show optimal weights + rebalancing delta, no full frontier |
| Cohort analysis | None | None | None | Portfolio groupBy sector/type/result — differentiator |

---

## Implementation Notes by Feature

### 1. Top Movers Widget
- Backend: `MOEXProvider.getTopMovers()` is ready, cached 60s in Redis
- UI: Two columns (gainers / losers), `TopMover` type already declared
- Interaction: Click ticker → open in terminal chart
- Refresh: Manual refresh button + auto-refresh on terminal tab focus
- Confidence: HIGH — all data contracts proven in tests

### 2. AI Free-Form Dialog
- Current: Quiz-gated conversation with fixed initial question sequence
- New: Open-ended conversation. System prompt establishes AI as trading advisor.
- Strategy extraction: Keep existing `extract_strategy` function call tool. AI decides when enough context is gathered to propose parameters — user does not drive wizard flow.
- Pattern used by Composer.trade and Capitalise.ai: user describes intent in natural language, platform extracts structured parameters. Same approach with DeepSeek function calling.
- Key UX change: Remove mandatory quiz sequence. Replace initial message with open invitation. Quick reply chips remain but are not required path.
- Context linking: When coming from terminal AI analysis, pre-load analysis summary into chat context. User can ask "create a strategy based on this analysis."

### 3. Correlation Matrix
- Data: MOEX ISS `/engines/stock/markets/shares/boards/TQBR/securities/{ticker}/candles.json` — daily candles
- Computation: Pearson correlation on daily log returns (not prices). `simple-statistics.sampleCorrelation()`.
- Visualization: `@nivo/heatmap` — diverging color scale (red = negative, blue = positive, grey = zero)
- Period: Default 90 days, options: 30/90/180 days
- Interaction: Hover tooltip shows exact correlation coefficient + 1-line interpretation ("Moderately correlated")
- Caching: Redis, 1 hour TTL per ticker set
- Confidence: MEDIUM — @nivo/heatmap confirmed in project constraints; Pearson on daily returns is standard practice

### 4. Sector Allocation Chart
- Data source: `fundamentals-map.ts` has `sector` for 40+ MOEX tickers. For unknown tickers, bucket as "other"
- Chart: `@nivo` Pie/Donut (already likely installed with @nivo/heatmap via @nivo/core)
- Breakdown: By weight (% of portfolio value) and by P&L contribution
- Sectors available: finance, energy, metals, tech, telecom, retail, utilities, transport, construction, chemicals, forestry, conglomerate
- Interaction: Click sector → highlight positions in that sector in positions table

### 5. Markowitz Optimization
- Inputs: portfolio weights, historical returns covariance matrix (reuse correlation data)
- Output: recommended weights to maximize Sharpe ratio, before/after bar chart, total rebalancing delta
- Math: Mean-variance optimization. For small portfolios (5-20 assets), quadratic programming not needed — gradient descent or brute-force over weight grid is sufficient with `simple-statistics`
- Constraints: weights sum to 1, min weight 0 (no shorting for retail MOEX accounts)
- UI: Before/after table with arrows showing direction of change. "Rebalance" button generates Telegram notification or copies to clipboard.
- Confidence: MEDIUM — math is standard; implementation complexity is in data pipeline, not the optimization itself

### 6. Cohort Analysis
- Group dimensions: by sector, by instrument type (stocks vs ETF vs bonds), by trade result (profitable/losing), by holding duration (< 1 week, 1 week - 1 month, > 1 month)
- Metrics per cohort: total P&L, average P&L, win rate, count
- UI: Grouped table + bar chart showing P&L by sector
- Data: All available from existing portfolio service + `fundamentals-map.ts`
- Confidence: HIGH — no new data sources needed

### 7. Strategy/Signal from Analysis Context
- Pattern: AI analysis response (chart/fundamental) ends with "Create strategy based on this analysis?" button
- On click: opens AI chat with pre-filled context message including the analysis result and ticker
- AI then extracts strategy parameters as usual via function calling
- Implementation: `onAnalysisComplete` callback passes analysis text to AI chat component

### 8. Full AI Portfolio Analysis
- Single button in portfolio header: "AI Analysis"
- Assembles: risk metrics, sector allocation, correlation summary, top positions, P&L overview
- Sends to DeepSeek with `portfolio` prompt (already defined in `ai-prompts.ts`)
- Output: rich markdown response in modal/sheet with sections for diversification, risk, recommendations
- Confidence: HIGH — prompt is ready, pattern matches existing `ai-analysis-actions.ts`

---

## Sources

- [Composer.trade AI strategy creation](https://www.composer.trade/ai) — natural language → structured strategy pattern
- [Capitalise.ai natural language trading](https://capitalise.ai/) — plain English → trading conditions
- [TradingView Correlation Heatmap](https://www.tradingview.com/script/eCMTOGfc-Correlation-HeatMap-Matrix-Data-TradingFinder/) — Pearson correlation, 20 assets, diverging color scale
- [OANDA Correlation Tool](https://www.oanda.com/bvi-en/lab-education/tools/correlation-tool/) — interaction patterns, period selector
- [PortfolioVisualizer Asset Correlations](https://www.portfoliovisualizer.com/asset-correlations) — standard inputs/outputs for correlation + optimization
- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) — function calling for parameter extraction (DeepSeek is OpenAI SDK compatible)
- [TradingView Top Gainers](https://www.tradingview.com/markets/stocks-usa/market-movers-gainers/) — UX reference for top movers display
- [CleanChart Treemap Guide](https://www.cleanchart.app/blog/how-to-create-treemap) — sector allocation chart patterns
- Existing codebase: `src/core/data/fundamentals-map.ts`, `src/server/providers/analytics/moex-provider.ts`, `src/core/types/terminal.ts`, `src/core/config/ai-prompts.ts`

---

*Feature research for: AculaTrade v1.1 — AI Revolution + Deep Analytics*
*Researched: 2026-03-25*
