# Project Research Summary

**Project:** AculaTrade v1.1 — AI Revolution + Deep Analytics
**Domain:** AI-augmented algorithmic trading platform, MOEX, Russian retail investors
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

AculaTrade v1.1 is a milestone upgrade to a production algorithmic trading platform focused on two axes: making AI interaction natural (free-form dialog instead of rigid quiz), and adding professional-grade portfolio analytics (correlation matrix, sector allocation, Markowitz optimization, cohort analysis). The codebase is mature — existing infrastructure covers AI function calling, broker integration, risk metrics, terminal charts, and top movers at the provider level. The primary build task is wiring these existing capabilities into UI and adding a thin analytics service layer. Almost no new external dependencies are needed; only `@nivo/heatmap` and `recharts` should be added. The Markowitz optimizer is implemented from scratch using `simple-statistics` primitives already in the project.

The recommended implementation order is: AI free-form dialog first (highest user impact, lowest infrastructure cost — only the system prompt changes), then terminal top movers (backend fully ready, zero new packages), then portfolio analytics in a layered build order (types → calculators → service → server actions → UI). This order is dictated by dependency isolation: AI chat and top movers are independent of the analytics pipeline, while full AI portfolio analysis should be last as it synthesizes correlation + sector data. The hard constraint throughout is the 150-line file limit and barrel export conventions required by project rules.

The key risks are concentrated in two areas: AI dialog producing premature or delayed strategy generation (the boundary between "enough info" and "needs more questions" is ambiguous to the model), and the analytics pipeline producing mathematically invalid output when edge cases occur — NaN correlation from flat-price bonds, Markowitz corner solutions from recent-winner portfolios, misaligned return series across different trading days. Both risk clusters have clear preventive patterns; the pitfalls research provides specific function-level code guards for each case.

---

## Key Findings

### Recommended Stack

The project needs only two new npm packages: `@nivo/heatmap@0.99.0` + `@nivo/core@0.99.0` for the correlation heatmap, and `recharts@3.8.1` for sector allocation donut, cohort bar charts, and Markowitz scatter (if needed). Both confirmed compatible with React 19. All other features extend the current stack: AI tooling uses the existing `openai` SDK v6.31.0 with DeepSeek V3; Markowitz math uses `simple-statistics` already installed; top movers is backend-complete with no new dependencies.

**Core technologies (additions only):**
- `@nivo/heatmap@0.99.0` + `@nivo/core@0.99.0`: correlation heatmap — only production-ready React heatmap with diverging color scale; alternatives abandoned or require custom SVG
- `recharts@3.8.1`: sector/cohort charts + Markowitz frontier — covers pie, bar, scatter in one library; avoids adding multiple nivo packages
- Custom Markowitz in `markowitz-calculator.ts`: in-house math using `simple-statistics` covariance + manual matrix inversion — no npm equivalent is maintained (`portfolio-allocation` last published 2020, v0.0.11)

**What NOT to add:** `mathjs`, `@vercel/ai`, `portfolio-allocation`, `@nivo/scatterplot`, `d3` — all rejected with clear rationale in STACK.md.

### Expected Features

**Must have (table stakes):**
- Top movers widget — every trading terminal has this; backend fully ready (`getTopMovers()` + `getTopMoversAction()` both complete), only UI component missing
- Sector allocation chart — standard in every portfolio tool; `sector` field already in `fundamentals-map.ts` for 40+ MOEX tickers
- Correlation matrix — standard in professional platforms; Pearson on daily returns via `simple-statistics` + `@nivo/heatmap`
- AI free-form strategy dialog — quiz-gated flow is blocking per Anton's feedback; Composer.trade and Capitalise.ai pattern confirms natural language → structured extraction is the right approach

**Should have (competitive differentiators):**
- Strategy/signal creation from AI analysis context — no platform does this inline; closes analysis→action loop
- Markowitz portfolio optimization + rebalancing — T-Invest has nothing like this; simplified weights + delta view (no full Monte Carlo)
- Cohort analysis by holding period/sector/type — no Russian retail broker offers this; most actionable cohort is holding duration vs P&L outcome
- Full AI portfolio analysis button — assembles all metrics into DeepSeek prompt; highest value/lowest cost feature

**Defer to v1.2+:**
- Top movers volume filter (% change + volume surge)
- Correlation matrix for watchlist tickers (not just portfolio)
- Historical rolling correlation (30/90 day)

**Defer to v2+:**
- Backtest engine
- Pine Script / scripted strategies
- News constructor

### Architecture Approach

The architecture slots new features into the existing 6-layer structure without restructuring. A new `PortfolioAnalyticsService` (orchestrator class, matching `RiskService` pattern) calls sub-calculators for correlation, sector, Markowitz, and cohort. These calculators are split into separate files to respect the 150-line limit. A single new `portfolio-analytics-actions.ts` file exposes four server actions. AI chat changes are isolated to `CHAT_SYSTEM_PROMPT` content only — no method signatures change. Top movers requires only one new component file.

**Major components:**
1. `PortfolioAnalyticsService` — orchestrates candle fetching (once, shared across calculators), Redis caching, delegates to sub-calculators
2. `correlation-calculator.ts`, `sector-calculator.ts`, `markowitz-calculator.ts`, `cohort-calculator.ts` — pure computation, no I/O
3. `portfolio-analytics-actions.ts` — server actions with auth + service calls
4. `AiChat` (modified) — adds `initialContext?: string` prop; seeds message history from terminal analysis; system prompt switches to free-form reasoning mode
5. `TopMoversWidget` — new component; polls `getTopMoversAction()` every 60s matching Redis TTL

**Build order (dependency-driven):**
Phase 1 (types + calculators) → Phase 2 (provider + service) → Phase 3 (server actions) → Phase 4 (AI changes, independent) → Phase 5 (terminal UI) → Phase 6 (portfolio UI + npm install)

### Critical Pitfalls

1. **AI fires `create_strategy` too early** — user describes vague intent and model calls tool immediately. Fix: define "enough" as instrument + timeframe + risk level; require confirmation summary before tool call. Add 6-turn fallback "generate" button in UI.

2. **Tool_call history breaks multi-turn conversations** — when `create_strategy` is called, the assistant message has `content: null` and must be preserved with the `tool_calls` array in subsequent API calls. Missing it causes 400 errors. Simplest fix for Phase 1: reset conversation context after strategy creation.

3. **Correlation matrix NaN from flat-price positions** — `simple-statistics.sampleCorrelation` throws on zero standard deviation (bonds, new positions). Fix: wrap in `safePearson()` guard returning 0 for flat series; mark cells with "недостаточно данных".

4. **Misaligned return series across trading days** — naive index-based zip produces spurious correlations. Fix: reuse existing `alignByDate` pattern (inner join on date strings); require minimum 20 aligned data points or return null.

5. **Markowitz corner solutions and covariance matrix instability** — unconstrained optimization produces 100% in one asset; near-perfect correlations cause near-singular matrix. Fix: min 5% / max 40% weight constraints; Tikhonov regularization (epsilon 0.001 on diagonal); fallback to equal-weight with explanation if inversion fails.

6. **MOEX sector mapping gaps for ETFs** — ISS API returns null sector for ETFs; inconsistent Russian sector name strings. Fix: static fallback map for top 50 MOEX tickers in `sector-map.ts`; ETFs in their own "ETF" category; unknown tickers → "Прочее".

7. **Top movers stale data outside trading hours** — 60s TTL returns yesterday's data as if live. Fix: detect market hours (09:50–18:50 MSK Mon–Fri) server-side; add `marketIsOpen: boolean` + `dataDate` to response; show "Биржа закрыта" badge and relabel as "за последнюю сессию".

---

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: AI Revolution (Free-Form Dialog + Context Bridge)

**Rationale:** Highest user-facing impact per Anton's feedback; no new dependencies; isolated to prompt content and one component prop addition. Can ship immediately without touching analytics pipeline. Independent of all other phases.

**Delivers:** Natural language strategy creation, terminal analysis → strategy creation flow, strategy refinement via continued dialog.

**Addresses features:** AI free-form dialog (P1), Strategy/signal from analysis context (P1).

**Avoids:** Premature tool calls (prompt engineering), tool_call history 400 errors (context reset after generation), context window blowup (summarized portfolio context, cap at last 10 turns).

**Files changed:** `deepseek-provider.ts` (prompt only), `ai/types.ts` (add "system" role), `ai-chat.tsx` (add `initialContext` prop).

**Research flag:** Standard patterns — skip research-phase. Existing function calling is proven in production.

---

### Phase 2: Terminal Depth (Top Movers Widget)

**Rationale:** Backend fully complete; only UI component is missing. Quickest visible win. No analytics pipeline dependency. Good milestone to ship between Phase 1 and the larger Phase 3.

**Delivers:** Top 5 gainers/losers panel in terminal, 60s refresh, click-to-navigate, market hours awareness.

**Addresses features:** Top movers widget (P1 priority).

**Avoids:** Stale data outside market hours (add `marketIsOpen` field), null instrument crashes (volume filter + `topN` guard), volume-less noise (require `VOLTODAY > 0`).

**Files changed:** New `top-movers-widget.tsx` only.

**Research flag:** Standard patterns — skip research-phase.

---

### Phase 3: Portfolio Analytics Infrastructure (Types + Calculators + Service + Actions)

**Rationale:** All portfolio analytics (correlation, sector, Markowitz, cohort) share the same data pipeline — candle fetching for all position tickers. Building the shared infrastructure once (types → calculators → service → actions) before any UI avoids the anti-pattern of each feature fetching candles independently. This is the most complex phase; the analytics pipeline must be solid before UI is added.

**Delivers:** `PortfolioAnalyticsService` with four methods, four server actions, all core types, all calculator functions — fully testable without any UI.

**Uses:** `simple-statistics` (already installed), Redis (existing caching pattern), `BrokerService` + `MOEXProvider` (existing).

**Implements:** Architecture components: correlation-calculator, sector-calculator, markowitz-calculator, cohort-calculator, portfolio-analytics-service, portfolio-analytics-actions.

**Avoids:** Re-fetching candles per feature (share via service), Markowitz instability (Tikhonov regularization + constraints), NaN correlation (safePearson guard), misaligned series (alignByDate inner join), sector ETF gaps (static fallback map).

**Research flag:** Needs focused review during planning on Markowitz math implementation (near-singular covariance handling is the highest-risk code in this milestone). The `alignByDate` pattern is standard — reuse from `risk-calculations.ts`. Cohort business logic needs explicit definition before coding (holding period vs P&L is the recommended primary dimension).

---

### Phase 4: Portfolio Analytics UI (Visualization Layer)

**Rationale:** Depends on Phase 3 server actions being stable. UI layer is additive — install two packages, build four components, add one tab to portfolio view. Full AI portfolio analysis button belongs here as it synthesizes correlation + sector data from Phase 3.

**Delivers:** Correlation heatmap, sector allocation donut, cohort table + bar chart, Markowitz weights panel with rebalancing delta, full AI portfolio analysis button.

**Uses:** `@nivo/heatmap@0.99.0`, `recharts@3.8.1` (install in this phase), existing AI prompts.

**Addresses features:** Correlation matrix (P2), Sector allocation (P1), Cohort analysis (P2), Markowitz optimization (P2), Full AI portfolio analysis (P1).

**Avoids:** NaN passed to nivo (validate before binding), Markowitz false precision (show ranges not exact numbers), correlation matrix without explanation (add color legend with labels), cohort without date filter.

**Research flag:** `@nivo/heatmap` integration is straightforward but SSR requires dynamic import. Standard pattern — skip research-phase.

---

### Phase Ordering Rationale

- Phases 1 and 2 are independent of each other and of Phases 3–4 — they can be built in parallel if multiple developers, or sequentially with fast shipping
- Phase 3 must precede Phase 4 — UI has no purpose without working server actions
- Correlation and Markowitz share the same candle fetch pipeline — building them in the same service is mandatory to avoid rate-limit issues with T-Invest API
- Full AI portfolio analysis is in Phase 4 (not Phase 1) because it must include correlation and sector data assembled in Phase 3 to be meaningful

### Research Flags

Phases needing deeper attention during planning:
- **Phase 3 (Markowitz math):** Covariance matrix inversion and Tikhonov regularization require careful implementation. The `ml-matrix` library was mentioned as an alternative to manual inversion — evaluate during phase planning whether it is worth adding for numerical stability vs. staying dependency-free.
- **Phase 3 (Cohort definition):** Business logic must be locked before coding. Recommendation is holding period as primary dimension (day-trader vs. buy-and-hold behavior). Confirm with Anton before Phase 3 starts.
- **Phase 3 (MOEX sector endpoint):** Two-call pattern for ISS `/cci/info/companies/industry-codes` + `/cci/reference/industry-codes` is MEDIUM confidence. Validate against live API during planning.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (AI dialog):** DeepSeek function calling with `tool_choice: "auto"` is proven in production.
- **Phase 2 (Top movers UI):** 60s polling with `setInterval` is the established pattern in the project.
- **Phase 4 (nivo/recharts UI):** Both libraries are well-documented; integration is additive.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package recommendations verified via `npm show`; existing stack confirmed production-working; only two new packages needed |
| Features | MEDIUM | Core features verified via codebase audit; MOEX-specific competitor analysis is sparse; feature priorities based on Anton's stated feedback |
| Architecture | HIGH | Based on direct codebase inspection of all relevant files; existing patterns are clear and consistent; build order validated by dependency graph |
| Pitfalls | HIGH | Based on live code audit; edge cases documented with specific line-level guards; math pitfalls are standard portfolio theory |

**Overall confidence:** HIGH

### Gaps to Address

- **MOEX ISS sector endpoint behavior:** ISS `/cci/info/companies/industry-codes` is MEDIUM confidence — verify the two-call pattern returns data in the expected `mapColumnsToObject` format before committing to the implementation. If the endpoint is unreliable, fall back to static sector map entirely.
- **Markowitz matrix inversion library decision:** The research recommends manual implementation (< 50 lines) but flags `ml-matrix` as an option for numerical stability. This choice should be made at the start of Phase 3 based on whether N (number of portfolio positions) in production exceeds 15 regularly.
- **Cohort analysis primary dimension:** "Holding period" is recommended but not confirmed with Anton. Lock this down before Phase 3 coding begins to avoid rework.
- **DeepSeek context reset vs. tool_call history:** The simpler approach (reset after strategy creation) defers multi-turn refinement to v1.2. If Anton wants "modify my strategy" conversation to work in the same session, implement proper tool_call history preservation in Phase 1 instead.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/server/providers/ai/deepseek-provider.ts` — AI function calling patterns, `CHAT_SYSTEM_PROMPT`
- Codebase: `src/server/services/risk-calculations.ts` — `alignByDate`, `standardDeviation`, `dailyReturns` implementations
- Codebase: `src/server/providers/analytics/moex-provider.ts` — `getTopMovers()` implementation, ISS API integration
- Codebase: `src/server/actions/terminal-actions.ts` — `getTopMoversAction()` confirmed complete
- Codebase: `src/core/data/fundamentals-map.ts` — `sector` field availability for 40+ MOEX tickers
- `npm show @nivo/heatmap@0.99.0` — version confirmed, React 19 compatible
- `npm show recharts@3.8.1` — version confirmed, React 18/19 supported
- `npm show portfolio-allocation` — v0.0.11, last publish 2020, abandoned (confirmed)
- OpenAI function calling spec (tool_call message format in multi-turn) — HIGH confidence

### Secondary (MEDIUM confidence)
- MOEX ISS API: `/engines/stock/markets/shares/boards/TQBR/securities.json` — `sort_column=LASTTOPREVPRICE` confirmed working, `LASTCHANGEPRCNT` returned (no official docs for sort params)
- MOEX ISS sector endpoints: `/cci/info/companies/industry-codes`, `/cci/reference/industry-codes` — from ISS reference docs, behavior not verified against live API
- `@nivo/heatmap` NaN handling — known issue from community reports, not tested directly
- Composer.trade, Capitalise.ai — natural language strategy extraction pattern (competitor analysis)

### Tertiary (LOW confidence)
- MOEX ISS sector field reliability for ETFs — inferred from integration experience, not verified against all ETF tickers in production

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
