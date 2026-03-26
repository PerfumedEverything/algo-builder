---
phase: 05-terminal-top-movers
verified: 2026-03-26T12:19:30Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 05: Terminal Top Movers Verification Report

**Phase Goal:** Users see the biggest daily gainers and losers in the terminal and can navigate to any of them with one click
**Verified:** 2026-03-26T12:19:30Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees Top Gainers panel with 5 instruments sorted by daily % change (positive) | VERIFIED | `TopMoversPanel` renders gainers column via `TopMoversSection`; `MOEXProvider.getTopMovers` returns sorted gainers from live MOEX API; 5 gainer rows confirmed by test |
| 2 | User sees Top Losers panel with 5 instruments sorted by daily % change (negative) | VERIFIED | Losers column rendered symmetrically; same data pipeline; 5 loser rows confirmed by test |
| 3 | User can click any instrument in either panel and terminal chart loads that instrument | VERIFIED | `onSelect` prop wired to `handleQuickSelect` in terminal page; `handleQuickSelect` calls `getInstrumentsAction`, finds instrument by ticker, calls `handleInstrumentSelect` which sets chart instrument state |
| 4 | Outside market hours, panels show a "Биржа закрыта" badge | VERIFIED | `isMarketOpen` prop propagated to both `TopMoversSection` columns; badge renders when `!isMarketOpen`; confirmed by test and component code line 50-55 |
| 5 | Top movers panels render even when no instrument is selected (discovery mode) | VERIFIED | Terminal page renders `<TopMoversPanel>` inside `{!instrument && (...)}` block at line 283; panel also rendered inside `{instrument && (...)}` block at line 324 |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/market-hours.ts` | isMarketOpen pure utility for MSK timezone | VERIFIED | 12 lines; exports `isMarketOpen`; correct MSK offset, boundary values 590/1130, weekend check via shifted UTC day |
| `src/components/terminal/top-movers-panel.tsx` | TopMoversPanel component with gainers+losers two-column grid | VERIFIED | 102 lines; named export `TopMoversPanel`; two-column grid, skeleton rows, "Биржа закрыта" badge, clickable rows with `onSelect` |
| `src/__tests__/lib/market-hours.test.ts` | Unit tests for market hours timezone logic | VERIFIED | 7 tests covering all boundary cases; all pass |
| `src/__tests__/terminal/top-movers-panel.test.tsx` | Unit tests for TopMoversPanel rendering and click behavior | VERIFIED | 7 tests covering rendering, click handlers, skeleton, badge; all pass |
| `src/app/(dashboard)/terminal/page.tsx` | Terminal page with TopMoversPanel integrated, polling, layout reorder | VERIFIED | 370 lines; `TopMoversPanel` imported and used in both instrument states; polling with `setInterval(fetchTopMovers, 60_000)` and `clearInterval` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `terminal/page.tsx` | `terminal-actions.ts` | `getTopMoversAction()` in `fetchTopMovers` callback | WIRED | Line 20 import; line 129 call inside `fetchTopMovers` callback; response sets `topMovers` state |
| `top-movers-panel.tsx` | `terminal/page.tsx` | `onSelect` prop connected to `handleQuickSelect` | WIRED | Lines 287 and 330 pass `onSelect={handleQuickSelect}`; `handleQuickSelect` defined at line 172 and calls `handleInstrumentSelect` |
| `terminal/page.tsx` | `market-hours.ts` | `isMarketOpen()` called in `fetchTopMovers` | WIRED | Line 23 import; line 131 call `setMarketOpen(isMarketOpen())` inside `fetchTopMovers` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `top-movers-panel.tsx` | `gainers`, `losers` props | `MOEXProvider.getTopMovers()` via `getTopMoversAction` | Yes — fetches `https://iss.moex.com/.../securities.json`, parses live market data, caches 60s in Redis | FLOWING |
| `terminal/page.tsx` | `topMovers` state | `getTopMoversAction()` response, set via `setTopMovers(res.data)` | Yes — data comes from real MOEX API response | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| isMarketOpen timezone logic | `npx vitest run src/__tests__/lib/market-hours.test.ts` | 7/7 tests pass | PASS |
| TopMoversPanel rendering and click handlers | `npx vitest run src/__tests__/terminal/top-movers-panel.test.tsx` | 7/7 tests pass | PASS |
| Module exports TopMoversPanel | `grep "export const TopMoversPanel"` in component file | Found at line 83 | PASS |
| Module exports isMarketOpen | `grep "export const isMarketOpen"` in utility file | Found at line 1 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TERM-01 | 05-01-PLAN.md | User sees "Top Gainers" block with instruments sorted by daily % change (positive) | SATISFIED | `TopMoversSection` with `TrendingUp` icon renders `gainers` array; `MOEXProvider.buildTopMovers` sorts by `changePct` descending for gainers |
| TERM-02 | 05-01-PLAN.md | User sees "Top Losers" block with instruments sorted by daily % change (negative) | SATISFIED | `TopMoversSection` with `TrendingDown` icon renders `losers` array; `MOEXProvider.buildTopMovers` sorts by `changePct` ascending for losers |
| TERM-03 | 05-01-PLAN.md | User can click any top mover to load its chart in terminal | SATISFIED | Click on row calls `onSelect(ticker)` → `handleQuickSelect(t)` → `getInstrumentsAction` → `handleInstrumentSelect(found)` → chart loads |

---

### Anti-Patterns Found

None detected. No TODOs, FIXMEs, placeholder content, or empty return stubs found in any phase artifact.

---

### Human Verification Required

#### 1. Visual layout on mobile

**Test:** Open terminal page on a mobile viewport (< 1024px). Observe that gainers and losers panels stack vertically.
**Expected:** Single-column layout; `grid-cols-1` active on small screens, `lg:grid-cols-2` on large.
**Why human:** CSS responsive behavior cannot be verified by grep or static analysis.

#### 2. Auto-refresh silent update

**Test:** Observe the terminal page for 60+ seconds while watching the top movers panels.
**Expected:** Data refreshes without any skeleton flash after the first load.
**Why human:** Time-dependent runtime behavior; requires observing the live app.

#### 3. Market-closed badge at correct boundary

**Test:** Simulate or wait for time outside 09:50-18:50 MSK Mon-Fri. Observe the badge appears.
**Expected:** "Биржа закрыта" badge shows in both column headers.
**Why human:** Runtime clock-based behavior; can't test against live clock without running the app.

---

### Gaps Summary

No gaps found. All 5 observable truths are verified. All 5 artifacts exist, are substantive, wired, and have confirmed data flow from the MOEX API. All 3 requirements (TERM-01, TERM-02, TERM-03) are satisfied. All 14 unit tests pass. No anti-patterns detected.

---

_Verified: 2026-03-26T12:19:30Z_
_Verifier: Claude (gsd-verifier)_
