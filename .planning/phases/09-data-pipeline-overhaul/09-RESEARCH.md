# Phase 9: Data Pipeline Overhaul — Research

**Researched:** 2026-03-27
**Domain:** Technical indicators, backtesting engine, MOEX candle normalization, Redis caching
**Confidence:** HIGH (core findings verified via live npm inspection and local execution)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DPIPE-01 | Replace `technicalindicators` with `trading-signals` for all 9 indicators (RSI, SMA, EMA, MACD, Bollinger, ATR, Stochastic, VWAP, WilliamsR) | API verified via local execution — full mapping documented below |
| DPIPE-02 | All indicator values match TradingView within 0.1% tolerance | Requires 500+ candle warmup period; `isStable` guard pattern documented |
| DPIPE-03 | Integrate `backtest-kit` — strategies backtested on historical MOEX data with configurable slippage/fees | `addExchangeSchema` + `setConfig` pattern documented; custom OHLCV adapter shown |
| DPIPE-04 | Terminal price bar shows daily session values: % change from MOEX session open, daily H/L, daily volume | Current bug identified — `high/low/volume` come from `lastCandle` (wrong); fix approach documented |
| DPIPE-05 | MOEX candle normalization utility: UTC→MSK, session boundaries, weekend/holiday filter | `market-hours.ts` exists but incomplete — normalizer utility design documented |
| DPIPE-06 | Historical candles cached in Redis with incremental updates | `PriceCache.setCandles/getCandles` exists — needs incremental append logic |
| DPIPE-07 | Comprehensive test suite: indicator accuracy vs TradingView refs, candle normalization edge cases, cache hit/miss | Vitest + vi.mock pattern for Redis already established in codebase |
| DPIPE-08 | Audit report: before/after indicator values vs TradingView for top 10 instruments | Script-based audit using fixed reference candle sequences |
</phase_requirements>

---

## Summary

The codebase uses `technicalindicators@3.1.0` which is a library that has seen minimal maintenance since 2020. All 9 indicators are currently called in one file: `src/server/services/indicator-calculator.ts`. The migration target is `trading-signals@7.4.3` — actively maintained, TypeScript-native, streaming-first design.

The API surface of `trading-signals` differs significantly from `technicalindicators`. The old library uses a functional batch API (`RSI.calculate({ values, period })`). The new library uses a stateful streaming class (`new RSI(14); rsi.add(price); rsi.getResult()`). MACD requires three indicator instances (`new MACD(new EMA(12), new EMA(26), new EMA(9))`), not a config object. The `StochasticOscillator` result shape is `{stochK, stochD}` instead of `{k}`. All these differences are fully mapped below.

`backtest-kit@5.9.0` is a framework built around event emitters and registered schemas. It requires a custom `addExchangeSchema` to feed MOEX candle data, and `setConfig` to configure MOEX-appropriate slippage (0.05%) and fees (0.03% T-Invest rate). The framework is designed for persistent backtests with markdown dump outputs — it is not a pure function that takes data and returns metrics. The planner must account for this architectural difference.

The terminal price bar bug is confirmed: `high`, `low`, and `volume` are read from `lastCandle` (the most recent candle in the selected chart period), not from today's session aggregate. Fix requires fetching today's 1-minute candles and aggregating H/L/Volume across the entire session.

**Primary recommendation:** Migrate `indicator-calculator.ts` in-place (same public API, swap internals), add a `candle-normalizer.ts` utility, extend `PriceCache` with incremental candle append, implement `backtest-kit` integration as a new `BacktestService`, and fix the terminal page to fetch daily session stats separately from chart candles.

---

## Project Constraints (from CLAUDE.md)

- OOP where applicable — services and providers must be classes
- DRY — shared logic in shared modules, no duplication
- No comments in code
- Max 150 lines per file — split large files
- Barrel exports (index.ts) for each module
- Early return instead of nested if
- Repository Pattern (Supabase JS SDK), Service Layer, Provider Pattern
- Server Actions: always `await getCurrentUserId()` first
- Entity access: always filter by userId
- TypeScript strict mode, no `any`
- Tailwind utility classes only (no custom CSS)
- Lucide icons only
- `shadcn/ui` via CLI: `npx shadcn@latest add`
- Vitest for unit tests — write for every new module
- No default exports except `page.tsx`, `layout.tsx`
- Errors via `new AppError(message, statusCode)`
- Import order: React/Next → External → @/core → @/server → @/components → @/hooks → @/lib → Relative

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `trading-signals` | 7.4.3 | Technical indicators (RSI, SMA, EMA, MACD, BB, ATR, Stoch, VWAP, WR) | Actively maintained, TypeScript-native, streaming design, verified working |
| `backtest-kit` | 5.9.0 | Strategy backtesting engine with slippage/fee modeling | Only TypeScript MOEX-compatible backtest lib in npm ecosystem |
| `ioredis` (existing) | 5.x | Redis caching for candles | Already in project, used in `price-cache.ts` |

### No New Dependencies

The migration replaces `technicalindicators` with `trading-signals`. The `backtest-kit` package is added. Both are already identified in the phase goal. No additional dependencies are required.

**Installation:**
```bash
npm install trading-signals backtest-kit
npm uninstall technicalindicators
```

**Version verification (confirmed live 2026-03-27):**
- `trading-signals`: 7.4.3 (published actively)
- `backtest-kit`: 5.9.0 (published actively)

---

## Architecture Patterns

### Recommended Structure for New Code

```
src/server/services/
├── indicator-calculator.ts    # REWRITE internals, keep public API
├── candle-normalizer.ts       # NEW: timezone + session normalization
├── backtest-service.ts        # NEW: backtest-kit integration
├── price-cache.ts             # EXTEND: add incremental candle caching
src/__tests__/
├── indicator-calculator.test.ts      # EXTEND: add accuracy tests
├── indicator-calculator-new.test.ts  # EXTEND
├── candle-normalizer.test.ts         # NEW
├── backtest-service.test.ts          # NEW (mocked)
```

### Pattern 1: trading-signals Migration — API Mapping

**What:** Replace each `technicalindicators` call with the `trading-signals` equivalent. The public method signatures of `IndicatorCalculator` do NOT change — consumers are unaffected.

**Verified API (tested locally 2026-03-27):**

```typescript
// RSI — close prices only
import { RSI } from 'trading-signals'
const rsi = new RSI(14)
candles.forEach(c => rsi.add(c.close))
const result = rsi.isStable ? Number(rsi.getResult()) : null

// SMA — close prices only
import { SMA } from 'trading-signals'
const sma = new SMA(period)
candles.forEach(c => sma.add(c.close))
const result = sma.isStable ? Number(sma.getResult()) : null

// EMA — close prices only
import { EMA } from 'trading-signals'
const ema = new EMA(period)
candles.forEach(c => ema.add(c.close))
const result = ema.isStable ? Number(ema.getResult()) : null

// MACD — requires THREE indicator instances (NOT a config object)
import { MACD, EMA } from 'trading-signals'
const macd = new MACD(new EMA(fastPeriod), new EMA(slowPeriod), new EMA(signalPeriod))
candles.forEach(c => macd.add(c.close))
const r = macd.isStable ? macd.getResult() : null
// r.macd, r.signal, r.histogram are Big.js objects — use Number(r.macd)

// BollingerBands — close prices only
import { BollingerBands } from 'trading-signals'
const bb = new BollingerBands(period, stdDev)
candles.forEach(c => bb.add(c.close))
const r = bb.isStable ? bb.getResult() : null
// r.upper, r.middle, r.lower are Big.js — use Number(r.upper)

// ATR — needs OHLCV objects
import { ATR } from 'trading-signals'
const atr = new ATR(period)
candles.forEach(c => atr.add({ high: c.high, low: c.low, close: c.close }))
const result = atr.isStable ? Number(atr.getResult()) : null

// Stochastic — StochasticOscillator(n=period, m=k_slowing, p=d_period)
import { StochasticOscillator } from 'trading-signals'
const stoch = new StochasticOscillator(period, 3, signalPeriod)
candles.forEach(c => stoch.add({ high: c.high, low: c.low, close: c.close }))
const r = stoch.isStable ? stoch.getResult() : null
// r.stochK (was r.k in technicalindicators), r.stochD

// VWAP — needs volume
import { VWAP } from 'trading-signals'
const vwap = new VWAP()
candles.forEach(c => vwap.add({ high: c.high, low: c.low, close: c.close, volume: c.volume }))
const result = vwap.isStable ? Number(vwap.getResult()) : null

// WilliamsR — needs OHLCV objects
import { WilliamsR } from 'trading-signals'
const wr = new WilliamsR(period)
candles.forEach(c => wr.add({ high: c.high, low: c.low, close: c.close }))
const result = wr.isStable ? Number(wr.getResult()) : null
```

**CRITICAL DIFFERENCES from old library:**
1. MACD constructor: `new MACD(new EMA(12), new EMA(26), new EMA(9))` — NOT `MACD.calculate({fastPeriod, slowPeriod, ...})`
2. Stochastic result: `r.stochK` not `r.k` — existing code reads `last.k`, must update
3. All numeric results are `Big.js` objects — must wrap in `Number()` before returning
4. `isStable` property replaces manual length checks (use `rsi.isStable` not `candles.length < period + 1`)
5. Streaming design: `add(value)` permanently appends; `update(value)` replaces last (for live candle updates)

### Pattern 2: Warmup Period for TradingView Accuracy

**What:** Feed 500+ candles to each indicator before using the result. This eliminates EMA initialization drift that causes deviation from TradingView.

**When to use:** Always for strategy checking and AI analysis. The `StrategyChecker` fetches candles with `getCandleRangeMs()` — currently returns 1 day for intraday or 365 days for daily. For intraday strategies using 1m/5m/15m candles, 1 day = ~400-500 1-minute candles. This is borderline — the warmup requirement means the range must guarantee 500+ candles.

```typescript
// In strategy-checker.ts: extend range to ensure 500+ candles
const MIN_WARMUP = 500
const getCandleRangeMs = (interval: string): number => {
  const rangeMap: Record<string, number> = {
    "1m": 7 * DAY,   // was 1 DAY — 7 days = 7*390 = 2730 candles
    "5m": 14 * DAY,  // was 1 DAY
    "15m": 30 * DAY, // was 1 DAY
    "1h": 60 * DAY,  // was 7 DAY
  }
  return rangeMap[interval] ?? 365 * DAY
}
```

### Pattern 3: backtest-kit Integration

**What:** Register a custom MOEX exchange schema wrapping Tinkoff API candles, then run `Backtest.background()` per strategy request.

**Architecture:** `BacktestService` class registers the schema once (module-level), exposes `runBacktest(strategyRow, params)` returning structured results.

```typescript
// backtest-service.ts skeleton
import { addExchangeSchema, addStrategySchema, setConfig, Backtest, listenDoneBacktest } from 'backtest-kit'

// Register once at module load
setConfig({
  CC_PERCENT_SLIPPAGE: 0.05,   // MOEX T-Invest slippage ~0.05%
  CC_PERCENT_FEE: 0.03,        // T-Invest fee ~0.03%
})

addExchangeSchema({
  exchangeName: 'tinkoff-moex',
  getCandles: async (symbol, interval, since, limit) => {
    // Fetch from Tinkoff API, map to backtest-kit format
    return candles.map(c => ({
      timestamp: c.time.getTime(),
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }))
  },
})
```

**CAUTION:** `backtest-kit` uses global singleton state (registered schemas, config). It is designed for long-running processes (workers), not for stateless Next.js server actions. Integration must happen in a dedicated worker or server-side singleton service, not in a server action that re-initializes on each request.

### Pattern 4: MOEX Candle Normalization

**What:** Utility that filters candles to MOEX session boundaries and converts timestamps to MSK.

**MOEX Sessions (confirmed from roadmap):**
- Main session: 10:00–18:40 MSK
- Evening session: 19:05–23:50 MSK
- MSK = UTC+3 (no DST since 2014)

**Current state:** `market-hours.ts` checks `mskMinutes >= 590 && mskMinutes < 1130` (9:50–18:50 MSK) — covers main session approximately. No evening session. No holiday handling.

```typescript
// candle-normalizer.ts
type NormalizerOptions = {
  includeEveningSession?: boolean
  filterWeekends?: boolean
}

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000  // UTC+3, no DST

const isInMoexSession = (utcDate: Date, opts: NormalizerOptions): boolean => {
  const mskMs = utcDate.getTime() + MSK_OFFSET_MS
  const mskDate = new Date(mskMs)
  const dayOfWeek = mskDate.getUTCDay()  // 0=Sun, 6=Sat
  if (opts.filterWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) return false
  const minuteOfDay = mskDate.getUTCHours() * 60 + mskDate.getUTCMinutes()
  const inMain = minuteOfDay >= 600 && minuteOfDay < 1120  // 10:00–18:40 MSK
  const inEvening = minuteOfDay >= 1145 && minuteOfDay < 1430  // 19:05–23:50 MSK
  return inMain || (!!opts.includeEveningSession && inEvening)
}

export const normalizeMoexCandles = (candles: Candle[], opts?: NormalizerOptions): Candle[] => {
  const options = { filterWeekends: true, includeEveningSession: false, ...opts }
  return candles.filter(c => isInMoexSession(c.time, options))
}

export const utcToMsk = (utcDate: Date): Date =>
  new Date(utcDate.getTime() + MSK_OFFSET_MS)
```

### Pattern 5: Terminal Price Bar Fix

**Current bug (confirmed in `terminal/page.tsx` lines 247–250):**
```typescript
// WRONG — uses lastCandle from the CHART period (could be weekly chart)
const high = lastCandle ? (lastCandle.high as number) : 0
const low = lastCandle ? (lastCandle.low as number) : 0
const volume = lastCandle ? ((lastCandle as { volume?: number }).volume ?? 0) : 0
const change = todayOpen > 0 ? ((currentPrice - todayOpen) / todayOpen) * 100 : 0
// todayOpen fetches a single 1d candle — but H/L/Vol still come from chart candle
```

**Fix approach:** Add a dedicated `fetchDailySessionStats(figi)` function that:
1. Fetches today's 1-minute candles from session open to now
2. Aggregates: `sessionOpen = candles[0].open`, `dailyHigh = max(highs)`, `dailyLow = min(lows)`, `dailyVolume = sum(volumes)`
3. Replaces the separate `fetchTodayOpen` and the flawed `lastCandle` reads

This requires a new server action `getDailySessionStatsAction(figi)` that returns `{ sessionOpen, high, low, volume }`.

### Pattern 6: Incremental Redis Candle Caching

**Current state:** `PriceCache.setCandles()` replaces the entire cache entry. `getCandles()` returns the full array or null.

**Required enhancement:** Incremental update — append new candles to cached array rather than full replacement.

```typescript
// Extension to PriceCache
async appendCandles(
  instrumentId: string,
  interval: string,
  newCandles: CachedCandle[],
): Promise<void> {
  const existing = await this.getCandles(instrumentId, interval) ?? []
  const lastTime = existing.length > 0 ? existing[existing.length - 1].time : null
  const fresh = lastTime
    ? newCandles.filter(c => c.time > lastTime)
    : newCandles
  if (fresh.length === 0) return
  const merged = [...existing, ...fresh]
  await this.setCandles(instrumentId, interval, merged)
}
```

**TTL strategy for longer candle history (500+ warmup):**

| Interval | Warmup candles needed | Time span | Recommended TTL |
|----------|----------------------|-----------|-----------------|
| 1m | 500 | ~8.5 hours | 4 hours (refresh each session) |
| 5m | 500 | ~2.5 days | 12 hours |
| 15m | 500 | ~7.5 days | 24 hours |
| 1h | 500 | ~20 days | 48 hours |
| 1d | 500 | ~2 years | 7 days |

Current TTL for 1m is 60 seconds — far too short for warmup. Must increase.

### Anti-Patterns to Avoid

- **Do NOT** use `StochasticOscillator` result as `r.k` — it is `r.stochK`
- **Do NOT** call `getResult()` without checking `isStable` — throws `NotEnoughDataError` (a custom error class in trading-signals, not a standard Error subclass)
- **Do NOT** pass a number as MACD's third argument — all three must be `TechnicalIndicator` instances (e.g., `new EMA(9)`)
- **Do NOT** register `backtest-kit` schemas inside server actions — use module-level singleton or worker
- **Do NOT** use `candles.length` guards after migration — use `indicator.isStable` instead
- **Do NOT** use `Number()` shallowly — `Big.js` results need `Number(rsi.getResult())`, not just `.valueOf()`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Technical indicators | Custom RSI/MACD/etc math | `trading-signals` | EMA initialization, Wilder smoothing, edge cases take months to get right |
| Backtesting engine | Custom candle replay loop | `backtest-kit` | Slippage modeling, partial fills, drawdown tracking are complex |
| Big.js arithmetic | Manual decimal handling | `Number()` wrapper | trading-signals returns Big.js — converting is trivial |
| MOEX holiday calendar | Custom holiday list | Skip for Phase 9 | Weekend filter sufficient; holidays are rare edge cases, add in Phase 9.x if needed |

---

## Common Pitfalls

### Pitfall 1: MACD Constructor — Not a Config Object

**What goes wrong:** `new MACD({ fastInterval: 12, slowInterval: 26, signalInterval: 9 })` silently creates an invalid instance. The `update()` call throws `TypeError: this.signal.update is not a function`.

**Why it happens:** The `trading-signals` v7 MACD constructor signature is `new MACD(short: TechnicalIndicator, long: TechnicalIndicator, signal: TechnicalIndicator)` — all three are instances.

**How to avoid:** `new MACD(new EMA(12), new EMA(26), new EMA(9))`

**Warning signs:** Runtime `TypeError` in `MACD.update`, not a type error.

### Pitfall 2: StochasticOscillator Result Shape Changed

**What goes wrong:** Old code reads `result.k` — returns `undefined` after migration because the property is now `stochK`.

**Why it happens:** `trading-signals` uses `{stochK, stochD}` naming.

**How to avoid:** Update `indicator-calculator.ts` line `return last.k ?? null` to `return last.stochK ?? null`.

### Pitfall 3: getResult() Throws on Insufficient Data

**What goes wrong:** `rsi.getResult()` throws `NotEnoughDataError` (not a plain `Error`) if called before `isStable === true`.

**Why it happens:** trading-signals uses a custom error class.

**How to avoid:** Always guard with `if (!indicator.isStable) return null` before calling `getResult()`.

### Pitfall 4: backtest-kit Requires File System and Global State

**What goes wrong:** `Backtest.background()` and `Backtest.dump()` write markdown files to disk and use global event emitters. Does not work in a stateless request handler.

**Why it happens:** The library is designed for persistent worker processes.

**How to avoid:** Use `backtest-kit` exclusively in the strategy worker process or a dedicated script. Expose results via a server action that reads the generated markdown file.

### Pitfall 5: Terminal Price Bar Shows Chart-Period H/L, Not Daily Session

**What goes wrong:** When user selects "1w" chart period, `lastCandle.high` is the week's high, `lastCandle.volume` is weekly volume — neither is the daily session value.

**Why it happens:** The terminal page currently derives H/L/Vol from the chart candles array (any selected period), not from a separate daily data fetch.

**How to avoid:** Fetch daily session stats independently via `getDailySessionStatsAction`. The chart period selector must NOT affect price bar values.

### Pitfall 6: Redis Candle TTL Too Short for Warmup

**What goes wrong:** 1-minute candles expire in 60 seconds. Strategy checker re-fetches 500+ candles on every run, creating heavy API load.

**Why it happens:** Current TTL was set for the old 1-day range (not 500-candle warmup).

**How to avoid:** Increase TTLs (see Pattern 6 table) and implement incremental append to avoid full refetch.

---

## Code Examples

### Complete IndicatorCalculator.calculateRSI Migration

```typescript
// Source: verified via local execution 2026-03-27
static calculateRSI(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null
  const rsi = new RSI(period)
  candles.forEach(c => rsi.add(c.close))
  return rsi.isStable ? Number(rsi.getResult()) : null
}
```

### Complete IndicatorCalculator.calculateMACD Migration

```typescript
// Source: verified via local execution 2026-03-27
static calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult | null {
  if (candles.length < slowPeriod + signalPeriod - 1) return null
  const macd = new MACD(new EMA(fastPeriod), new EMA(slowPeriod), new EMA(signalPeriod))
  candles.forEach(c => macd.add(c.close))
  if (!macd.isStable) return null
  const r = macd.getResult()
  return {
    macd: Number(r.macd),
    signal: Number(r.signal),
    histogram: Number(r.histogram),
  }
}
```

### Complete IndicatorCalculator.calculateStochastic Migration

```typescript
// Source: verified via local execution 2026-03-27
// CRITICAL: result property is stochK not k
static calculateStochastic(candles: Candle[], period = 14, signalPeriod = 3): number | null {
  if (candles.length < period + signalPeriod) return null
  const stoch = new StochasticOscillator(period, 3, signalPeriod)
  candles.forEach(c => stoch.add({ high: c.high, low: c.low, close: c.close }))
  if (!stoch.isStable) return null
  const r = stoch.getResult()
  return Number(r.stochK)
}
```

### backtest-kit Custom Exchange Schema Pattern

```typescript
// Source: backtest-kit README + local exports inspection 2026-03-27
import { addExchangeSchema, setConfig } from 'backtest-kit'

setConfig({
  CC_PERCENT_SLIPPAGE: 0.05,
  CC_PERCENT_FEE: 0.03,
})

addExchangeSchema({
  exchangeName: 'tinkoff-moex',
  getCandles: async (symbol: string, interval: string, since: Date, limit: number) => {
    const broker = getBrokerProvider()
    // connect with system token, fetch candles
    const candles = await broker.getCandles({ instrumentId: symbol, interval, from: since, to: new Date() })
    return candles.map(c => ({
      timestamp: c.time.getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }))
  },
})
```

### Incremental Candle Cache Append

```typescript
// Extension to PriceCache — avoids full API refetch on each strategy check
async appendCandles(instrumentId: string, interval: string, newCandles: CachedCandle[]): Promise<void> {
  const existing = await this.getCandles(instrumentId, interval) ?? []
  const lastTime = existing.at(-1)?.time ?? null
  const fresh = lastTime ? newCandles.filter(c => c.time > lastTime) : newCandles
  if (fresh.length === 0) return
  await this.setCandles(instrumentId, interval, [...existing, ...fresh])
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `technicalindicators` (batch functional API) | `trading-signals` (streaming class API) | v7 of trading-signals | Requires refactor of `IndicatorCalculator` |
| Manual candle range (1 day) | 500+ candle warmup | Phase 9 | Better indicator accuracy matching TradingView |
| No backtesting | `backtest-kit` integration | Phase 9 | Users can validate strategy on historical MOEX data |
| `lastCandle` for H/L/Vol in price bar | Session-aggregate daily stats | Phase 9 | Terminal shows correct daily values regardless of chart period |

**Deprecated/outdated:**
- `technicalindicators` 3.1.0: Last meaningful release 2020, no TypeScript strict support, no streaming. Replace entirely.
- Per-candle H/L/Vol from chart in terminal: Semantically wrong — will be replaced with dedicated daily stats fetch.

---

## Open Questions

1. **backtest-kit file system dependency**
   - What we know: `Backtest.dump()` writes markdown to disk. Works in Node.js worker.
   - What's unclear: Whether it can work in a Next.js API route with read-only filesystem (Docker).
   - Recommendation: Implement backtesting as a server-side script or in the existing worker process. Phase 9 should scope to "BacktestService runs in worker, results stored in DB". UI for backtesting can be Phase 9.1.

2. **MOEX public holiday handling**
   - What we know: Weekend filter alone misses ~10 public holidays/year.
   - What's unclear: No public MOEX holiday API is documented (ISS does not expose a holiday calendar endpoint directly).
   - Recommendation: Add weekend filter in Phase 9. Defer holiday calendar to a future phase — impact is minor (rare false positives on indicators).

3. **TradingView reference values source for accuracy tests**
   - What we know: The audit (DPIPE-08) requires before/after comparison vs TradingView.
   - What's unclear: TradingView does not expose a public API for indicator values. Reference values must be manually captured from the UI.
   - Recommendation: Hardcode ~200 OHLCV candles + expected indicator values for SBER (liquid, stable) as a fixture in the test suite. Capture once from TradingView manually during Wave 0.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | v20.19.0 | — |
| Redis | Candle caching | ✓ (local) | 7.x (VPS) | — |
| `trading-signals` | DPIPE-01/02 | ✓ (npm) | 7.4.3 | — |
| `backtest-kit` | DPIPE-03 | ✓ (npm) | 5.9.0 | — |
| Tinkoff API token | DPIPE-04, 05 | ✓ (env var exists) | — | — |
| Vitest | DPIPE-07 | ✓ (devDep) | 4.1.0 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test -- --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DPIPE-01 | All 9 indicators produce values after migration | unit | `npm test -- indicator-calculator` | ✅ (extend existing) |
| DPIPE-02 | RSI/EMA values match TradingView reference within 0.1% | unit | `npm test -- indicator-accuracy` | ❌ Wave 0 |
| DPIPE-03 | BacktestService registers schema without throwing | unit | `npm test -- backtest-service` | ❌ Wave 0 |
| DPIPE-04 | getDailySessionStatsAction aggregates H/L/Vol correctly | unit | `npm test -- daily-session-stats` | ❌ Wave 0 |
| DPIPE-05 | CandleNormalizer filters out pre-market, weekend, post-session candles | unit | `npm test -- candle-normalizer` | ❌ Wave 0 |
| DPIPE-06 | PriceCache.appendCandles deduplicates by timestamp | unit | `npm test -- price-cache` | ✅ (extend existing) |
| DPIPE-07 | Full indicator test suite passes | unit | `npm test` | partial |
| DPIPE-08 | Audit script compares before/after values | manual | Script run manually | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --run src/__tests__/indicator-calculator`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/indicator-accuracy.test.ts` — covers DPIPE-02 (requires hardcoded TradingView reference candles for SBER)
- [ ] `src/__tests__/backtest-service.test.ts` — covers DPIPE-03 (mock Tinkoff provider)
- [ ] `src/__tests__/candle-normalizer.test.ts` — covers DPIPE-05 (edge: pre-session candle, weekend candle, evening session boundary)
- [ ] `src/__tests__/daily-session-stats.test.ts` — covers DPIPE-04 (mock getCandlesForChartAction)
- [ ] `scripts/audit-indicators.ts` — DPIPE-08 audit script (run manually, writes markdown report)

---

## Sources

### Primary (HIGH confidence)

- Local npm execution of `trading-signals@7.4.3` — all indicator APIs tested and confirmed
- Local npm execution of `backtest-kit@5.9.0` — exports, config keys, schema API confirmed
- `/src/server/services/indicator-calculator.ts` — current API surface, all 9 indicators mapped
- `/src/app/(dashboard)/terminal/page.tsx` — price bar bug confirmed at lines 247–250
- `/src/server/services/price-cache.ts` — existing Redis candle caching pattern
- `vitest.config.ts` + existing test files — test infrastructure confirmed

### Secondary (MEDIUM confidence)

- backtest-kit README (fetched from raw.githubusercontent.com) — custom exchange schema pattern
- bennycode.com/trading-signals — indicator category overview
- GitHub tripolskypetr/backtest-kit — `setConfig` option names

### Tertiary (LOW confidence)

- MOEX session hours (19:05 evening session start) — from roadmap spec, not independently verified against official MOEX documentation. Risk: evening session start time may be 19:00, not 19:05.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both libraries installed and tested locally
- API migration mapping: HIGH — all 9 indicators executed successfully
- Architecture: HIGH — patterns derived from existing codebase conventions
- backtest-kit integration: MEDIUM — schema API verified, but file system behavior in Docker not tested
- MOEX session boundaries: MEDIUM — weekend filter confirmed, evening session time from spec only
- Pitfalls: HIGH — all critical differences discovered via actual execution errors

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable libraries, 30-day window)
