---
phase: 01-infrastructure-terminal
plan: 04
subsystem: ui
tags: [lightweight-charts, candlestick, chart, trading, t-invest]

requires: []
provides:
  - InstrumentChart component with candlestick rendering via lightweight-charts v5
  - ChartPeriodSelector component for timeframe switching (1d/1w/1m/3m/1y)
  - getCandlesForChartAction server action for chart data
  - getTradeMarkersAction server action for BUY/SELL markers
  - BrokerService.getCandles method for candle data retrieval
affects: [01-05, terminal-page, portfolio-position-expand]

tech-stack:
  added: [lightweight-charts ^5.1.0]
  patterns: [createSeriesMarkers for v5 marker API, addSeries with CandlestickSeries definition]

key-files:
  created:
    - src/server/actions/chart-actions.ts
    - src/components/portfolio/instrument-chart.tsx
    - src/components/portfolio/chart-period-selector.tsx
  modified:
    - src/server/services/broker-service.ts
    - package.json

key-decisions:
  - "Used lightweight-charts v5 API (addSeries + CandlestickSeries definition) instead of deprecated v4 addCandlestickSeries"
  - "Used createSeriesMarkers plugin for trade markers instead of deprecated series.setMarkers"
  - "InstrumentChart is purely presentational (props-driven) for reusability across terminal and portfolio"

patterns-established:
  - "Chart component pattern: useRef + useEffect with chart.remove() cleanup, consumer loads via next/dynamic ssr:false"
  - "Chart data flow: server action -> BrokerService.getCandles -> provider.getCandles -> format for lightweight-charts"

requirements-completed: [CHRT-01, CHRT-02, CHRT-03, CHRT-07]

duration: 14min
completed: 2026-03-23
---

# Phase 01 Plan 04: Chart Infrastructure Summary

**Candlestick chart with lightweight-charts v5, dark theme CSS vars, trade BUY/SELL markers, and 5-period selector for terminal and portfolio use**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-23T18:53:57Z
- **Completed:** 2026-03-23T19:08:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- InstrumentChart renders OHLCV candlestick data with emerald up / red down colors and dark theme using CSS vars
- ChartPeriodSelector provides inline button group for 5 timeframes (1d/1w/1m/3m/1y)
- Server actions format T-Invest candle data for lightweight-charts (intraday as Unix timestamp, daily+ as YYYY-MM-DD)
- Trade markers (BUY/SELL) overlay on chart via createSeriesMarkers plugin
- Zero `as any` usage -- proper CandlestickData<Time> and SeriesMarker<Time> types throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Install lightweight-charts and create chart data server actions** - `da1c33a` (feat)
2. **Task 2: Build InstrumentChart component and ChartPeriodSelector** - `f56ded8` (feat)

## Files Created/Modified
- `src/server/actions/chart-actions.ts` - Server actions for chart candle data and trade markers
- `src/components/portfolio/instrument-chart.tsx` - Candlestick chart component using lightweight-charts v5
- `src/components/portfolio/chart-period-selector.tsx` - Period selector button group (1d/1w/1m/3m/1y)
- `src/server/services/broker-service.ts` - Added getCandles method for chart data retrieval
- `package.json` - Added lightweight-charts ^5.1.0 dependency

## Decisions Made
- Used lightweight-charts v5 API: `chart.addSeries(CandlestickSeries, opts)` instead of deprecated `chart.addCandlestickSeries(opts)` from v4
- Used `createSeriesMarkers(series, markers)` plugin instead of deprecated `series.setMarkers()` from v4
- InstrumentChart accepts candles and markers as props without internal data fetching, enabling reuse in both terminal page and portfolio position expand

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added getCandles method to BrokerService**
- **Found during:** Task 1 (chart-actions.ts creation)
- **Issue:** BrokerService had no getCandles method, chart action needed to call broker through service layer pattern
- **Fix:** Added getCandles(userId, params) method following existing service pattern (getSettings -> connect -> provider.getCandles)
- **Files modified:** src/server/services/broker-service.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** da1c33a (Task 1 commit)

**2. [Rule 3 - Blocking] Adapted to lightweight-charts v5 API**
- **Found during:** Task 2 (InstrumentChart creation)
- **Issue:** Plan was written for v4 API (addCandlestickSeries, series.setMarkers). Installed v5 uses different API
- **Fix:** Used v5 API: addSeries(CandlestickSeries), createSeriesMarkers(series, markers)
- **Files modified:** src/components/portfolio/instrument-chart.tsx
- **Verification:** TypeScript compilation passes with proper v5 types
- **Committed in:** f56ded8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for functionality. No scope creep.

## Issues Encountered
- npm cache permission conflict (EACCES on shared cache file) caused by parallel agent execution. Resolved by using separate cache directory via `--cache` flag.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully functional with proper data sources.

## Next Phase Readiness
- InstrumentChart and ChartPeriodSelector ready for terminal page wiring (Plan 05)
- Chart server actions ready for consumption by both terminal and portfolio expand views
- Consumers must use `next/dynamic({ ssr: false })` when importing InstrumentChart (lightweight-charts requires window)

## Self-Check: PASSED
- All 5 files exist (3 created, 2 modified)
- Both task commits verified: da1c33a, f56ded8

---
*Phase: 01-infrastructure-terminal*
*Completed: 2026-03-23*
