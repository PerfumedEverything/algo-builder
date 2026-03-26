---
phase: 06-portfolio-analytics
verified: 2026-03-26T13:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Open portfolio page, click Аналитика tab, observe heatmap renders with colored cells"
    expected: "Heatmap shows N×N grid with red/green color scale, high-correlation pairs (>0.7) highlighted with amber ring-2 border"
    why_human: "Visual rendering and color accuracy cannot be verified programmatically"
  - test: "Confirm sector donut chart displays with correct sector labels and percentages summing to ~100%"
    expected: "PieChart with innerRadius (donut hole) shows sectors with legend displaying name and percent"
    why_human: "Chart rendering and data accuracy depend on broker connection and live portfolio data"
  - test: "Confirm asset type horizontal bar chart shows at least stocks category"
    expected: "BarChart layout='vertical' renders bars with Russian labels (Акции, ETF, Облигации, Валюта)"
    why_human: "Requires live broker data to confirm non-empty render"
  - test: "Confirm trade success chart shows profitable vs unprofitable strategies from real strategy data"
    expected: "Pie chart with green/red cells and stat cards showing count and total P&L per category"
    why_human: "Requires existing strategies with operations in database"
---

# Phase 06: Portfolio Analytics Verification Report

**Phase Goal:** Users can understand portfolio diversification quality through correlation heatmap, sector allocation chart, and cohort breakdowns by asset type and trade success
**Verified:** 2026-03-26T13:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a correlation heatmap of all portfolio positions showing pairwise movement | VERIFIED | `CorrelationHeatmap` renders N×N Tailwind grid from `CorrelationMatrix.matrix`; data flows from `getCorrelationMatrixAction` → `PortfolioAnalyticsService.getCorrelationMatrix` → real 90-day candles via `BrokerService.getCandles` → Pearson via `sampleCorrelation` |
| 2 | High-correlation pairs (Pearson > 0.7) are visually flagged with distinct style | VERIFIED | `highPairs` computed in service where `Math.abs(corr) > 0.7`; heatmap applies `ring-2 ring-amber-400` class via `isHighCorr()` lookup against `highSet` |
| 3 | User sees a sector allocation donut chart showing MOEX sector percentages | VERIFIED | `SectorDonut` renders `PieChart` with `innerRadius={55}` (donut hole); data from `getSectorAllocation` using `FUNDAMENTALS_MAP[pos.ticker].sector`; passed via `getPortfolioAnalyticsAction` |
| 4 | User sees a cohort breakdown by asset type (stocks, bonds, ETF, currency) | VERIFIED | `AssetTypeChart` renders horizontal `BarChart`; data from `getAssetTypeBreakdown` grouping by `pos.instrumentType`; Russian labels (Акции, ETF, Облигации, Валюта, Фьючерсы) applied |
| 5 | User sees a cohort breakdown by trade success (profitable vs unprofitable by count and value) | VERIFIED | `TradeSuccessChart` renders `PieChart` plus two stat cards; data from `getTradeSuccessBreakdown` iterating all user strategies, calling `OperationService.getStats` per strategy, classifying by `stats.pnl > 0` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/core/types/analytics.ts` | Type definitions for all analytics data shapes | VERIFIED | All 5 types present: `CorrelationMatrix`, `SectorAllocation`, `AssetTypeBreakdown`, `TradeSuccessBreakdown`, `PortfolioAnalytics` |
| `src/core/types/index.ts` | Barrel export of analytics types | VERIFIED | `export * from "./analytics"` present at line 6 |
| `src/server/services/portfolio-analytics-service.ts` | Analytics service with 4 methods | VERIFIED | 120 lines, all 4 methods fully implemented with real data sources |
| `src/server/services/index.ts` | Barrel export of PortfolioAnalyticsService | VERIFIED | `export { PortfolioAnalyticsService }` at line 13 |
| `src/server/actions/analytics-actions.ts` | Two server actions for analytics | VERIFIED | `getCorrelationMatrixAction` and `getPortfolioAnalyticsAction` fully implemented with auth check and error handling |
| `src/components/portfolio/correlation-heatmap.tsx` | Heatmap component with high-pair flagging | VERIFIED | 92 lines, full Tailwind grid, color scale, tooltip, `ring-2 ring-amber-400` for high pairs |
| `src/components/portfolio/sector-donut.tsx` | Donut chart for sector allocation | VERIFIED | 91 lines, Recharts `PieChart` with `innerRadius={55}`, legend with percent, sector color map |
| `src/components/portfolio/asset-type-chart.tsx` | Horizontal bar chart for asset types | VERIFIED | 89 lines, Recharts `BarChart` with `layout="vertical"`, color per type, tooltip with count and percent |
| `src/components/portfolio/trade-success-chart.tsx` | Pie + stat cards for trade success | VERIFIED | 84 lines, Recharts `PieChart` plus two stat cards with TrendingUp/Down icons, P&L display |
| `src/app/(dashboard)/portfolio/page.tsx` | Portfolio page with Аналитика tab | VERIFIED | Tab gated on `connected`, lazy-loads analytics only on first tab click, 2-column layout with all 4 components |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `portfolio/page.tsx` | `getCorrelationMatrixAction` | `import` + `fetchAnalytics()` call | WIRED | Imported at line 23-25, called in `fetchAnalytics` callback triggered on tab click |
| `portfolio/page.tsx` | `getPortfolioAnalyticsAction` | `import` + `fetchAnalytics()` call | WIRED | Same callback, both actions called in parallel via `Promise.all` |
| `portfolio/page.tsx` | `CorrelationHeatmap` | import + JSX with `matrix` prop | WIRED | Imported line 26, rendered at line 171-175 with `correlationMatrix` state |
| `portfolio/page.tsx` | `SectorDonut` | import + JSX with `data` prop | WIRED | Imported line 27, rendered at line 177-180 with `portfolioAnalytics?.sectorAllocation` |
| `portfolio/page.tsx` | `AssetTypeChart` | import + JSX with `data` prop | WIRED | Imported line 28, rendered at line 181-184 with `portfolioAnalytics?.assetTypeBreakdown` |
| `portfolio/page.tsx` | `TradeSuccessChart` | import + JSX with `data` prop | WIRED | Imported line 29, rendered at line 187-190 with `portfolioAnalytics?.tradeSuccessBreakdown` |
| `analytics-actions.ts` | `PortfolioAnalyticsService` | instantiation + method calls | WIRED | `analyticsService = new PortfolioAnalyticsService()`, called in both actions |
| `PortfolioAnalyticsService` | `BrokerService.getCandles` | internal class call | WIRED | `this.broker.getCandles(userId, ...)` in `getCorrelationMatrix` |
| `PortfolioAnalyticsService` | `OperationService.getStats` | internal class call | WIRED | `this.operationService.getStats(strategy.id)` in `getTradeSuccessBreakdown` |
| `PortfolioAnalyticsService` | `FUNDAMENTALS_MAP` | direct import + lookup | WIRED | `FUNDAMENTALS_MAP[pos.ticker]?.sector` in `getSectorAllocation` |
| `PortfolioAnalyticsService` | `sampleCorrelation` (simple-statistics) | import + usage in matrix loop | WIRED | `sampleCorrelation(returnsArr[i]..., returnsArr[j]...)` at line 53 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CorrelationHeatmap` | `matrix: CorrelationMatrix` | `getCorrelationMatrixAction` → `BrokerService.getCandles` → 90-day candle fetch → Pearson calculation | Yes — live candle data from broker API | FLOWING |
| `SectorDonut` | `data: SectorAllocation[]` | `getPortfolioAnalyticsAction` → `getSectorAllocation(positions)` → `FUNDAMENTALS_MAP` lookup | Yes — real portfolio positions × static sector map | FLOWING |
| `AssetTypeChart` | `data: AssetTypeBreakdown[]` | `getPortfolioAnalyticsAction` → `getAssetTypeBreakdown(positions)` → group by `pos.instrumentType` | Yes — real portfolio positions | FLOWING |
| `TradeSuccessChart` | `data: TradeSuccessBreakdown` | `getPortfolioAnalyticsAction` → `getTradeSuccessBreakdown(userId)` → `StrategyRepository.findByUserId` + `OperationService.getStats` per strategy | Yes — real strategy and operation data from DB | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — analytics components require live broker connection and database data; all checks would produce empty results without a running server and authenticated user session.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PORT-01 | 06-01, 06-02 | User sees correlation heatmap showing position movement correlation | SATISFIED | `CorrelationHeatmap` component + `getCorrelationMatrixAction` + `PortfolioAnalyticsService.getCorrelationMatrix` fully implemented and wired |
| PORT-02 | 06-01, 06-02 | High-correlation pairs (>0.7) visually flagged on heatmap | SATISFIED | `highPairs` computed where `Math.abs(corr) > 0.7` in service; `ring-2 ring-amber-400` applied in heatmap component |
| PORT-03 | 06-01, 06-02 | User sees sector allocation as donut/pie chart | SATISFIED | `SectorDonut` with `innerRadius={55}` (donut hole) + `getSectorAllocation` via `FUNDAMENTALS_MAP` |
| PORT-04 | 06-01, 06-02 | User sees cohort breakdown by asset type | SATISFIED | `AssetTypeChart` horizontal `BarChart` + `getAssetTypeBreakdown` grouping by `instrumentType` with Russian labels |
| PORT-05 | 06-01, 06-02 | User sees cohort breakdown by trade success | SATISFIED | `TradeSuccessChart` pie + stat cards + `getTradeSuccessBreakdown` reading real strategy P&L from DB |

All 5 PORT requirements satisfied. No orphaned requirements found.

### Anti-Patterns Found

No TODO, FIXME, HACK, or placeholder patterns found across any of the 6 phase files scanned. No stub implementations (empty returns, hardcoded empty arrays without data fetch) detected.

### Human Verification Required

#### 1. Correlation Heatmap Visual Rendering

**Test:** Connect a broker account, navigate to portfolio page, click "Аналитика" tab, wait for loading to complete, observe the correlation heatmap.
**Expected:** Grid of colored cells appears — green shades for positive correlation, red for negative. Diagonal cells are blank (self-correlation). High-correlation pairs (>0.7) have a visible amber/orange border ring.
**Why human:** Color rendering, visual layout, and hover tooltip behavior cannot be verified programmatically.

#### 2. Sector Donut Chart Accuracy

**Test:** With a real portfolio, observe the sector donut chart under Аналитика tab.
**Expected:** Donut chart shows colored sectors with labels and percentages. All percentages sum to approximately 100%. Sectors present in portfolio appear (energy, finance, etc.). Positions not in FUNDAMENTALS_MAP appear under "other".
**Why human:** Requires live portfolio data and visual confirmation of chart rendering.

#### 3. Asset Type Bar Chart Rendering

**Test:** Observe asset type horizontal bar chart.
**Expected:** Horizontal bars appear for each asset type in portfolio (Акции, ETF, Облигации, Валюта). Bars are color-coded. Tooltip on hover shows value, count, and percentage.
**Why human:** Requires live portfolio with multiple asset types.

#### 4. Trade Success Breakdown with Real Strategies

**Test:** Ensure user has at least one closed/active strategy with operations, then observe trade success chart.
**Expected:** Pie chart and two stat cards appear. Profitable count and P&L shown in green. Unprofitable count and P&L shown in red. If no strategies have operations, shows "Нет закрытых стратегий" message.
**Why human:** Requires real strategy and operations data in the database.

### Gaps Summary

No gaps found. All 5 observable truths are verified at all four levels (exists, substantive, wired, data-flowing). All 9 commits documented in summaries are confirmed present in git history. All external dependencies (simple-statistics, recharts, BrokerService, OperationService, FUNDAMENTALS_MAP) are verified to exist. The lazy-load pattern (analytics fetched only on first tab click, not on page load) is correctly implemented.

---

_Verified: 2026-03-26T13:00:00Z_
_Verifier: Claude (gsd-verifier)_
