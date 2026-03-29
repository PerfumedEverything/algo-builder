# Phase 15: Grid Trading - Research

**Researched:** 2026-03-28
**Domain:** Grid Trading Engine (Paper Trading + Bybit), Competitive UX Analysis, AI Parameter Suggestion
**Confidence:** HIGH (core algorithm), MEDIUM (MOEX feasibility), HIGH (competitor analysis)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Обязательный deep research Grid Trading платформ: Veles, 3Commas, Pionex, Bitsgap, KuCoin Grid, а также западные конкуренты (Cryptohopper, Quadency, TradeSanta и др.). Анализ UX/UI, параметров, механик. Взять лучшее у каждого.
- **D-02:** Наш Grid должен быть самым удобным и user-friendly, но не менее функциональным чем конкуренты.
- **D-03:** Research готовых библиотек/решений для Grid Trading — не писать с нуля если есть проверенные решения.
- **D-04:** Paper trading (симуляция) в первую очередь — НЕ реальные ордера. Симуляция на стриме цен из WebSocket.
- **D-05:** Bybit — основная целевая биржа для Grid (placeOrder/cancelOrder уже реализованы в Phase 14).
- **D-06:** MOEX — нужен отдельный research: возможно ли grid trading на Московской бирже, есть ли API для лимитных ордеров, какие ограничения. Решение по MOEX принимается после research.
- **D-07:** TDD строго — тесты ПЕРЕД реализацией. Права на ошибки нет.
- **D-08:** Симуляция 100+ ценовых тиков — проверить количество сделок и P&L до копейки.
- **D-09:** Edge cases: partial fills, price gaps, concurrent orders, boundary conditions, выход цены за пределы сетки.
- **D-10:** P&L math с точными числами (как FIFO в Phase 12).
- **D-11:** Verify против известного поведения Veles (Phase 16 — cross-validation).
- **D-12:** Тип сетки, распределение уровней (arithmetic/geometric), trailing — определяется после research конкурентов.
- **D-13:** Новый тип стратегии `GRID` в StrategyConfig с параметрами (lowerPrice, upperPrice, gridLevels, amountPerOrder).

### Claude's Discretion
- Архитектура GridTradingService — класс, state machine, event-driven
- Способ хранения состояния сетки (DB schema)
- Интеграция с существующей системой стратегий vs отдельная сущность

### Deferred Ideas (OUT OF SCOPE)
- Реальные ордера на Bybit — после валидации paper trading (возможно Phase 15.1)
- Grid Trading на MOEX — зависит от результатов research (возможно отдельная фаза)
- Trailing grid — продвинутая механика, после базовой работает
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRID-01 | `GridTradingService` рассчитывает уровни сетки равномерно между границами | Arithmetic distribution formula documented below |
| GRID-02 | При исполнении buy → автоматически выставляется sell на уровень выше, и наоборот | Buy→sell cycle mechanics from Pionex/3Commas patterns |
| GRID-03 | P&L сетки = sum(profit от каждой пары buy-sell) | Bybit formula: GridProfit = sellQty * sellPrice * (1-fee) - buyQty * buyPrice |
| GRID-04 | При выходе цены за границы → уведомление пользователю | All platforms notify on out-of-range; use existing NotificationService |
| GRID-05 | Тест: симуляция 100 тиков → проверить количество сделок и P&L | Pure function GridEngine testable without broker; Vitest deterministic |
| GRID-06 | Новый тип стратегии `GRID` в StrategyConfig с параметрами | GridConfig type extension — discriminated union pattern |
| GRID-07 | Форма создания с визуализацией уровней на графике TradingView | lightweight-charts `createPriceLine()` for level overlay |
| GRID-08 | Мониторинг: ордера на графике (исполненные/ожидающие), P&L в реалтайме | Price line colors: green=filled, blue=pending, red=lower bound |
| GRID-09 | Кнопка остановки: отменяет все pending ордера, фиксирует результат | Stop action: cancel all PENDING grid orders, snapshot P&L |
| GRID-10 | AI анализирует волатильность и предлагает параметры сетки | ATR/volatility-based range suggestion via DeepSeek |
</phase_requirements>

---

## Summary

Grid trading automates a buy-low/sell-high cycle across a predefined price range: the engine places limit buy orders at each grid level below current price and limit sell orders above. When a buy fills, a corresponding sell is placed one level higher; when that sell fills, a new buy is placed back at the lower level. Each completed buy→sell pair generates profit equal to the grid step minus fees. This cycle repeats continuously as long as price stays within bounds.

**No dedicated npm library needed.** The core algorithm is a simple pure function (40-80 lines of TypeScript). All competitor platforms implement this natively. The complexity is in state management, DB persistence, and paper-trading simulation — not the grid math itself. The project already has all required infrastructure: `bybit-stream-worker.ts` (price stream), `BrokerProvider.placeOrder/cancelOrder` (Bybit impl), `NotificationService`, `InstrumentChart` (lightweight-charts for level overlay).

**MOEX feasibility:** Technical possibility confirmed (T-Invest API supports limit orders, 900 orders/min rate limit). However, MOEX is NOT a priority for Phase 15 — Bybit paper trading ships first. MOEX grid deferred to future phase per D-06.

**Primary recommendation:** Implement `GridTradingEngine` as a pure stateless class (testable in isolation) + `GridTradingService` for DB/broker coordination. Paper trading simulates fills by comparing each price tick against pending order levels. Arithmetic grid (equal price intervals) as default — simpler, more predictable, preferred for sideways crypto markets.

---

## Competitive Analysis

### Platform Comparison Matrix

| Platform | Grid Types | Key Parameters | UX Differentiator | Weakness |
|----------|------------|----------------|-------------------|----------|
| **Pionex** | Spot, Futures, Infinity, Leveraged | Upper/lower price, grid count, total investment, AI auto | AI 2.0 suggests range from 7/30/180d volatility; copy-bot from community | 403 on help pages (locked content) |
| **3Commas** | Arithmetic, Geometric, Futures | Upper/lower, grid step %, amount per level, trailing up/down, expansion | Pair list sorted by 120d backtest ROI; click pair → params auto-fill | Visually overwhelming for new traders |
| **Bitsgap** | Arithmetic, Geometric | Upper/lower, grid step %, grid levels, TP/SL, trailing up/down, pump protection | Clean split arithmetic/geometric choice; pump protection flag; trailing down with capital extension | Less exchange support |
| **KuCoin** | Spot Grid, Futures Grid | Total investment, entry price trigger, stop loss, take profit, AI Plus | AI Plus dynamically adjusts range/spacing/amounts per volatility; confirmation popup UX | Complex parameter overlap |
| **Veles** | GRID + DCA hybrid | Overlapping range, grid order count, Martingale %, indent, log distribution | Signal mode: indicators drive grid placement; 3 trading modes (Simple/Own/Signal) | DCA hybrid adds complexity; "not very convenient" per Anton |
| **TradeSanta** | Spot Grid | Range, grid count, individual TP per trade | Per-trade take-profit (each filled buy gets its own sell TP) | No visualization on bot creation — major UX gap |
| **Quadency** | Spot Grid | Range, count | Simple clean UI | No position threshold; frequent errors; bots stop immediately |
| **Cryptohopper** | Grid (configurable) | Custom, AI-managed | Best-in-class AI management; AI auto-corrects params | Not out-of-box grid like competitors |

### Best-of-Breed UX Features to Adopt

These are the features worth taking from each platform:

1. **From Pionex:** AI parameter suggestion with multiple lookback periods (7d/30d/180d), one-click AI-fill, maximum drawdown indicator displayed during setup. Copy community bots.
2. **From 3Commas:** Auto-fill parameters when pair is selected (based on backtest); pair list sorted by expected ROI.
3. **From Bitsgap:** Clear arithmetic/geometric choice at top of form; pump protection awareness; trailing toggle with clear explanation.
4. **From KuCoin:** Entry trigger price (bot activates when price hits target); clean confirmation popup before launch.
5. **From TradeSanta:** Per-trade take-profit concept (each completed buy-sell pair has its own TP). But fix their weakness: **always show visualization**.
6. **What all miss / our advantage:** Real-time grid level overlay on the chart during setup (not after). Show levels updating live as user types parameters. TradeSanta doesn't do this at all. Bitsgap/3Commas show static preview only.

### What Veles Gets Wrong (Anton's Feedback)
- Grid creation UX is "not convenient" — too many parameters without guidance
- No live chart preview while configuring
- Modes (Simple/Own/Signal) create confusion

### Our UX Differentiators
- **Live chart preview while typing parameters** — levels update in real-time as user adjusts upper/lower/count
- **AI one-click** — fills all params from volatility analysis, shows expected profit % per grid
- **3-metric summary before launch:** grids count, profit per grid %, total capital required
- **Color-coded monitoring:** green=filled sell, blue=pending, orange=active buy position
- **Stop with summary modal** — shows final P&L, trades count, profit breakdown before stopping

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| No new library needed | — | Grid engine | Algorithm is 40-80 lines pure TS |
| `bybit-api` | 4.6.1 (existing) | Bybit order execution | Already integrated in BybitProvider |
| `trading-signals` | 7.4.3 (existing) | ATR calculation for AI param suggestion | Already in project |
| `lightweight-charts` | 5.1.0 (existing) | Grid level overlay on chart | `createPriceLine()` API |
| `ioredis` | 5.10.0 (existing) | Price stream from bybit-stream-worker | Redis pub/sub already working |
| `vitest` | 4.1.0 (existing) | TDD for GridEngine | Already configured |

### No New Dependencies Required
All required libraries are already in `package.json`. The grid engine is pure TypeScript with no new npm dependencies.

**Version verification:** All packages verified from existing `package.json` — no installs needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/types/
│   ├── strategy.ts              # Add GridConfig type (discriminated union)
│   └── grid.ts                  # NEW: GridOrder, GridLevel, GridState types
├── server/
│   ├── services/
│   │   ├── grid-engine.ts       # NEW: Pure stateless engine (testable)
│   │   └── grid-trading-service.ts  # NEW: DB + broker coordination
│   ├── repositories/
│   │   └── grid-repository.ts   # NEW: Supabase CRUD for grid state
│   └── actions/
│       └── grid-actions.ts      # NEW: Server actions for UI mutations
└── app/(dashboard)/
    └── terminal/
        └── _components/
            ├── grid-form.tsx     # NEW: Create/edit grid dialog
            ├── grid-monitor.tsx  # NEW: Active grid status panel
            └── grid-levels-overlay.tsx  # NEW: chart price lines hook
```

### Pattern 1: GridEngine — Pure Stateless Calculation

The engine operates on snapshots of state (no side effects). This enables deterministic testing with 100+ ticks.

```typescript
// src/server/services/grid-engine.ts
// Source: derived from standard grid trading algorithm

export interface GridLevel {
  index: number
  price: number         // exact level price
  side: 'BUY' | 'SELL'
  status: 'PENDING' | 'FILLED' | 'CANCELLED'
  orderId?: string
  filledAt?: Date
  pairedWith?: number   // index of paired level
}

export interface GridState {
  levels: GridLevel[]
  realizedPnl: number
  totalTrades: number
  isActive: boolean
  outOfRange: boolean
}

export class GridEngine {
  // Calculate arithmetic grid levels (equal price intervals)
  static calculateLevels(
    lowerPrice: number,
    upperPrice: number,
    gridCount: number,
  ): number[] {
    const step = (upperPrice - lowerPrice) / (gridCount - 1)
    return Array.from({ length: gridCount }, (_, i) => lowerPrice + i * step)
  }

  // Initialize grid state from current price
  static initializeState(
    levels: number[],
    currentPrice: number,
    amountPerOrder: number,
  ): GridLevel[] {
    return levels.map((price, index) => ({
      index,
      price,
      // Orders below current price are BUY, above are SELL
      side: price < currentPrice ? 'BUY' : 'SELL',
      status: 'PENDING',
      quantity: amountPerOrder / price,
    }))
  }

  // Process a price tick: returns which orders were filled + new counter-orders
  static processTick(
    currentPrice: number,
    state: GridLevel[],
    feeRate: number,
  ): { filled: GridLevel[]; pnlDelta: number } {
    // ...
  }
}
```

### Pattern 2: Paper Trading Simulation

Paper trading simulates fills by comparing each price tick against pending order prices. A buy order fills when price drops to or below the order price. A sell fills when price rises to or above it.

```typescript
// Simulation loop (paper trading via Redis price stream)
async function onPriceTick(price: number, gridId: string) {
  const state = await gridRepository.getActiveOrders(gridId)
  const { filled, pnlDelta } = GridEngine.processTick(price, state, FEE_RATE)

  for (const order of filled) {
    await gridRepository.markFilled(order.index, gridId, price)
    // Place counter-order on level above/below
    const counterSide = order.side === 'BUY' ? 'SELL' : 'BUY'
    const counterIndex = order.side === 'BUY' ? order.index + 1 : order.index - 1
    await gridRepository.activateOrder(counterIndex, gridId)
  }

  if (pnlDelta !== 0) {
    await gridRepository.addPnl(gridId, pnlDelta)
  }
}
```

### Pattern 3: StrategyConfig Discriminated Union Extension

```typescript
// src/core/types/strategy.ts — extend StrategyConfig

export type GridConfig = {
  type: 'GRID'
  lowerPrice: number
  upperPrice: number
  gridLevels: number           // number of price lines (min 3, max 100)
  amountPerOrder: number       // USDT per order (quote currency)
  gridDistribution: 'ARITHMETIC' | 'GEOMETRIC'  // default: ARITHMETIC
  stopLoss?: number            // optional: auto-stop if price drops below
  takeProfit?: number          // optional: auto-stop if profit target reached
}

// Discriminated union — preserves existing StrategyConfig for indicator strategies
export type StrategyConfig = IndicatorStrategyConfig | GridConfig

export type IndicatorStrategyConfig = {
  type?: 'INDICATOR'  // implicit default for backward compat
  entry: StrategyCondition[]
  exit: StrategyCondition[]
  entryLogic: LogicOperator
  exitLogic: LogicOperator
  risks: StrategyRisks
}
```

### Pattern 4: Grid State DB Schema

```sql
-- grid_orders table (Supabase)
CREATE TABLE grid_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id       UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  level_index   INT NOT NULL,
  price         DECIMAL(20, 8) NOT NULL,
  side          TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity      DECIMAL(20, 8) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED')),
  filled_at     TIMESTAMPTZ,
  filled_price  DECIMAL(20, 8),
  realized_pnl  DECIMAL(20, 8) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (grid_id, level_index)
);

-- grid_stats view (aggregated per grid)
-- totalTrades, realizedPnl, status stored on strategy row (config JSON)
```

### Pattern 5: lightweight-charts Price Lines for Grid Overlay

```typescript
// Grid level visualization using existing lightweight-charts
// Source: https://tradingview.github.io/lightweight-charts/docs/api

function addGridLevels(chart: IChartApi, levels: GridLevel[]) {
  const series = chart.addLineSeries()
  levels.forEach(level => {
    series.createPriceLine({
      price: level.price,
      color: level.status === 'FILLED' ? '#26a69a'   // green = filled
           : level.side === 'SELL'     ? '#ef5350'   // red = sell pending
           :                            '#1976d2',   // blue = buy pending
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `${level.side} #${level.index}`,
    })
  })
}
```

### Anti-Patterns to Avoid

- **Don't poll DB for price ticks** — use Redis pub/sub (`price-updates` channel, already published by `bybit-stream-worker.ts`)
- **Don't store grid state in memory only** — all state persists to `grid_orders` table; process restart must restore correctly
- **Don't use floating point equality for price comparison** — always use `price <= tickPrice` with tolerance or integer arithmetic (multiply by 10^8)
- **Don't couple GridEngine to broker** — engine is pure function; broker calls happen in GridTradingService only
- **Don't skip fee calculation** — all competitor formulas subtract fees from P&L; ignoring fees will produce incorrect results vs Veles (Phase 16 validation)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ATR calculation | Custom ATR code | `trading-signals` ATR (already installed) | Proven, tested, used in existing indicator calculator |
| WebSocket price stream | New WS connection | Existing `bybit-stream-worker.ts` → Redis pub/sub | Already running, publishes to `price-updates` channel |
| Chart price lines | Custom canvas overlay | `lightweight-charts createPriceLine()` | Native API, handles scaling/re-renders automatically |
| Notifications | Custom notification system | Existing `NotificationService` | Telegram already wired up in Phase 14 |
| Order placement | Direct API calls | `BrokerProvider.placeOrder/cancelOrder` | Interface ready, Bybit implemented in Phase 14 |
| P&L precision | JS float arithmetic | Multiply by 1e8, work in integers, divide at display | Same pattern used in FIFO calculator (Phase 12) |

**Key insight:** Grid trading is architecturally simple — the algorithm is ~60 lines. The hard part is correct state management, DB persistence, and edge case handling. All infrastructure already exists.

---

## MOEX Grid Trading Feasibility

### Research Verdict: TECHNICALLY POSSIBLE, STRATEGICALLY DEFERRED

**What T-Invest API supports:**
- Limit orders via `postOrder` method — confirmed
- Rate limits: 15 orders/sec (900/min), 100 cancels/min — sufficient for small grids
- Sandbox environment available for testing
- `ReplaceOrder` method available for atomic order replacement

**What makes MOEX grid harder than Bybit:**
- MOEX has strict trading sessions (09:50-18:40 MSK + 18:40-23:50 MSK evening). Grid must pause between sessions — adds complexity.
- Lot sizes: MOEX instruments trade in lots (e.g., 10 shares per lot for SBER). Grid levels must align to lot boundaries.
- T-Invest API's `TinkoffProvider.placeOrder` currently throws `NotImplementedError` — needs implementation before any MOEX grid.
- No 24/7 operation — price can gap overnight significantly, triggering many orders simultaneously on open.
- Currency is RUB, amounts require different precision handling vs USDT.

**Decision (confirmed by D-06):** MOEX grid is a future phase. Phase 15 = Bybit paper trading only.

---

## Common Pitfalls

### Pitfall 1: Floating Point Price Comparison
**What goes wrong:** `price === 51234.56` fails when price is `51234.560000001` from JSON parsing.
**Why it happens:** JavaScript float representation; Bybit API returns strings parsed to float.
**How to avoid:** Use `Math.abs(price - targetPrice) < epsilon` or store prices as integers (multiply by 10^8). Same pattern as FIFO in Phase 12.
**Warning signs:** Tests pass but simulation produces 0 fills.

### Pitfall 2: Concurrent Fill Race Condition
**What goes wrong:** Two ticks arrive simultaneously; both see the same PENDING order and fill it twice.
**Why it happens:** Redis pub/sub can deliver messages concurrently; no locking on order status check.
**How to avoid:** Use Supabase row-level UPDATE with `WHERE status = 'PENDING'` returning the row — atomic check-and-set. Process `rows_affected === 0` as "already filled by another tick."
**Warning signs:** Duplicate fills, P&L double-counted.

### Pitfall 3: Grid Boundary Overfill
**What goes wrong:** Price drops below lowerPrice; all buy orders fill simultaneously, draining capital.
**Why it happens:** Price gap (e.g., after weekend) can skip through all levels at once.
**How to avoid:** Track `outOfRange` flag. When triggered: notify user, pause new counter-orders, do NOT cancel existing orders (per Pionex/3Commas behavior). Edge case: price returns to range → resume.
**Warning signs:** User loses all capital without notification.

### Pitfall 4: Counter-Order at Missing Level
**What goes wrong:** BUY at index 0 (lowest level) fills → try to place SELL at index -1 (doesn't exist).
**Why it happens:** Counter-order logic doesn't check boundary.
**How to avoid:** Guard: if `counterIndex < 0 || counterIndex >= levels.length`, skip counter-order placement. This is expected behavior — profit from partial grid.
**Warning signs:** Array index out of bounds error at runtime.

### Pitfall 5: P&L Calculation Ignoring Fees
**What goes wrong:** P&L shows +$50 but actual net is +$32 after Bybit maker/taker fees.
**Why it happens:** Fee rates not included in profit formula.
**How to avoid:** Always compute: `profit = (sellPrice - buyPrice) * qty - (buyPrice * qty * feeRate) - (sellPrice * qty * feeRate)`. Bybit default: 0.1% maker, 0.1% taker for spot.
**Warning signs:** Phase 16 cross-validation shows >1% deviation from Veles.

### Pitfall 6: Strategy Type Backward Compatibility
**What goes wrong:** Existing indicator strategies break because `StrategyConfig` type changed.
**Why it happens:** Adding discriminated union to `StrategyConfig` requires updating all type guards.
**How to avoid:** Make `type` field optional with default: `type?: 'INDICATOR' | 'GRID'`. Guard: `config.type === 'GRID'` routes to grid handler, else falls through to existing indicator logic.
**Warning signs:** TypeScript errors in `strategy-checker.ts`, `backtest-service.ts`, Zod schema validators.

---

## P&L Math (Authoritative Formula)

### Spot Grid P&L per completed cycle:
```
gridProfit = (sellQty * sellPrice * (1 - feeRate)) - (buyQty * buyPrice)
```

Where:
- `feeRate` = 0.001 (0.1% Bybit default spot)
- `sellQty ≈ buyQty` (slight difference due to fee rounding — use actual fill quantities)
- For paper trading: `feeRate` = configurable (default 0.001 to simulate real costs)

### Grid step profit % (arithmetic):
```
profitPerGrid% = (gridStep / lowerPrice) * 100 - (feeRate * 200)
```

Example: 100 USDT range, 10 grids, 9 gaps → step = 100/9 = 11.11 USDT per level.

### Total theoretical profit (all grids complete N cycles):
```
totalProfit = profitPerGrid * gridCount * cycleCount
```

### Source: Bybit P&L documentation + Bitsgap formula documentation (MEDIUM confidence — cross-verified between two platforms).

---

## AI Parameter Suggestion (GRID-10)

### How Pionex/KuCoin Do It
1. Fetch recent OHLCV candles (7/30/180 day lookbacks)
2. Calculate ATR or price range percentile (high-low range over period)
3. Set `lowerPrice = min(price) * 0.98` and `upperPrice = max(price) * 1.02` for buffer
4. Calculate `gridLevels` from volatility: higher vol → fewer grids (larger steps); lower vol → more grids (tighter)
5. Show backtested expected return for suggested params

### Our AI Implementation (DeepSeek)
The existing `AiContextService` + DeepSeek can be extended. Prompt structure:
```
Given recent price data for {symbol}:
- ATR(14): {atr}
- Price range 30d: {low} - {high}
- Current price: {price}
- Available capital: {amount} USDT

Suggest grid trading parameters:
- lowerPrice: (current * 0.85 or recent 30d low)
- upperPrice: (current * 1.15 or recent 30d high)
- gridLevels: (10-30 based on volatility)
- amountPerOrder: (totalCapital / gridLevels / 3 for safety)
- expectedProfitPerGrid: % calculation
- reasoning: why these bounds
```

ATR calculation: use `trading-signals` library (already installed, used in `indicator-calculator.ts`).

---

## Code Examples

### Grid Level Calculation (Arithmetic)
```typescript
// Source: derived from 3Commas/Pionex algorithm documentation
static calculateArithmeticLevels(
  lower: number,
  upper: number,
  count: number,
): number[] {
  if (count < 2) throw new Error('Grid requires at least 2 levels')
  const step = (upper - lower) / (count - 1)
  return Array.from({ length: count }, (_, i) =>
    Math.round((lower + step * i) * 1e8) / 1e8  // round to 8 decimal places
  )
}
```

### Grid Level Calculation (Geometric)
```typescript
// Source: derived from Bitsgap/3Commas geometric grid documentation
static calculateGeometricLevels(
  lower: number,
  upper: number,
  count: number,
): number[] {
  if (count < 2) throw new Error('Grid requires at least 2 levels')
  const ratio = Math.pow(upper / lower, 1 / (count - 1))
  return Array.from({ length: count }, (_, i) =>
    Math.round(lower * Math.pow(ratio, i) * 1e8) / 1e8
  )
}
```

### Paper Trading Tick Processor
```typescript
// Deterministic, no side effects — suitable for 100-tick simulation test
static processTick(
  tickPrice: number,
  orders: GridLevel[],
  feeRate: number,
): { updatedOrders: GridLevel[]; pnlDelta: number; filledCount: number } {
  let pnlDelta = 0
  let filledCount = 0
  const updated = orders.map(order => {
    if (order.status !== 'PENDING') return order
    const filled =
      (order.side === 'BUY' && tickPrice <= order.price) ||
      (order.side === 'SELL' && tickPrice >= order.price)
    if (!filled) return order
    filledCount++
    if (order.side === 'SELL' && order.pairedWith !== undefined) {
      const buyOrder = orders[order.pairedWith]
      if (buyOrder?.status === 'FILLED') {
        pnlDelta +=
          (order.price * order.quantity * (1 - feeRate)) -
          (buyOrder.price * buyOrder.quantity)
      }
    }
    return { ...order, status: 'FILLED' as const, filledAt: new Date() }
  })
  return { updatedOrders: updated, pnlDelta, filledCount }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed arithmetic grid only | Arithmetic + Geometric + AI-suggested | 2023-2024 | Need to support both; default arithmetic |
| Manual parameter entry | AI auto-fill + community copy | 2024 | Implement AI suggestion (GRID-10) |
| Chart shows grid after launch | Live preview during setup | 2025 (our differentiator) | Key UX win over competitors |
| Simple bot stop | Stop with P&L summary modal | Best practice now | Phase 15 must include summary |
| No trailing | Trailing up/down | 2023+ | Deferred — out of scope for Phase 15 |

**Deprecated/outdated:**
- Static parameter entry without AI: All major platforms (Pionex, KuCoin, 3Commas) now have AI auto-fill. Our GRID-10 requirement is industry-standard.
- Grid without visualization: TradeSanta doesn't show chart preview — universally criticized. Must always show chart preview.

---

## Open Questions

1. **Geometric vs Arithmetic as default**
   - What we know: Arithmetic is simpler, more predictable, better for sideways. Geometric better for trends.
   - What's unclear: Anton's preference not explicitly stated.
   - Recommendation: Default to ARITHMETIC, offer GEOMETRIC as toggle in advanced settings.

2. **GridTradingService as separate entity vs integrated into Strategy system**
   - What we know: GRID is a new strategy type (`D-13`), suggesting integration into existing strategy rows.
   - What's unclear: Whether the existing `Strategy` table's `status` and `config` columns can accommodate grid lifecycle states without schema migration complexity.
   - Recommendation: Reuse `strategies` table with `type='GRID'` in config. Add new `grid_orders` table for order state. This avoids duplicating auth/ownership checks and reuses existing UI patterns (`StrategyDialog`, `StrategyForm`).

3. **Price stream for paper trading: Redis pub/sub vs polling**
   - What we know: `bybit-stream-worker.ts` already publishes to `price-updates` Redis channel.
   - What's unclear: Whether the Next.js server can subscribe to Redis pub/sub in a Server Action context, or needs a separate worker process.
   - Recommendation: Create `grid-worker.ts` following the `bybit-stream-worker.ts` pattern — subscribes to `price-updates`, processes ticks for all active grids, writes fills to DB. This keeps stateful loops out of Next.js.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Grid worker | ✓ | v20.19.0 | — |
| Redis | Price stream subscription | ✓ (existing) | configured | — |
| Bybit WebSocket | Live prices for paper trading | ✓ | bybit-api 4.6.1 | — |
| `vitest` | TDD requirement D-07 | ✓ | 4.1.0 | — |
| `lightweight-charts` | Chart level overlay | ✓ | 5.1.0 | — |
| `trading-signals` | ATR for AI suggestion | ✓ | 7.4.3 | — |
| Supabase | Grid orders persistence | ✓ (existing) | configured | — |

**Missing dependencies with no fallback:** None — all required infrastructure exists.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (or implicit via `package.json`) |
| Quick run command | `npx vitest run src/__tests__/grid-engine.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRID-01 | `calculateLevels(100, 200, 5)` returns `[100, 125, 150, 175, 200]` | unit | `npx vitest run src/__tests__/grid-engine.test.ts` | ❌ Wave 0 |
| GRID-02 | buy fill at level N → sell placed at N+1 | unit | same | ❌ Wave 0 |
| GRID-03 | P&L = sum of (sellPrice * qty * (1-fee)) - (buyPrice * qty) | unit | same | ❌ Wave 0 |
| GRID-04 | price < lowerPrice → `outOfRange=true` in state | unit | same | ❌ Wave 0 |
| GRID-05 | 100 tick simulation → exact trades count + P&L | unit | `npx vitest run src/__tests__/grid-simulation.test.ts` | ❌ Wave 0 |
| GRID-06 | GridConfig Zod schema validates / rejects | unit | `npx vitest run src/__tests__/schemas.test.ts` | ✅ (extend existing) |
| GRID-07 | Grid form renders level count from inputs | unit (React Testing Library) | `npx vitest run src/__tests__/grid-form.test.tsx` | ❌ Wave 0 |
| GRID-08 | Monitor shows correct pending/filled counts | unit | same | ❌ Wave 0 |
| GRID-09 | Stop action cancels all PENDING orders, returns final P&L | unit | same | ❌ Wave 0 |
| GRID-10 | AI suggestion returns non-null params for ATR input | unit (mock DeepSeek) | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/grid-engine.test.ts src/__tests__/grid-simulation.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/grid-engine.test.ts` — covers GRID-01, GRID-02, GRID-03, GRID-04
- [ ] `src/__tests__/grid-simulation.test.ts` — covers GRID-05 (100 tick simulation)
- [ ] `src/__tests__/grid-form.test.tsx` — covers GRID-07, GRID-08, GRID-09
- [ ] `src/core/types/grid.ts` — GridLevel, GridState, GridConfig types
- [ ] `src/server/services/grid-engine.ts` — pure engine class (Wave 0: skeleton + types)

---

## Project Constraints (from CLAUDE.md)

- **OOP for services** — `GridTradingService` and `GridEngine` must be classes
- **DRY** — reuse `BrokerProvider`, `NotificationService`, `AiContextService`, existing Redis patterns
- **No comments in code**
- **Max 150 lines per file** — `grid-trading-service.ts` likely needs split: `grid-engine.ts` (pure calc) + `grid-trading-service.ts` (DB/broker)
- **Early return** — no nested if in engine logic
- **No default exports** except page.tsx/layout.tsx — `GridEngine`, `GridTradingService` use named exports
- **Server Actions** — always `await getCurrentUserId()` first; all grid mutations via `*Action` functions
- **Entity ownership** — all grid_orders queries must filter by userId (via grid_id → strategies.userId)
- **Zod schemas** — `gridConfigSchema` for form validation, `gridOrderSchema` for API inputs
- **TypeScript strict, no `any`**
- **Barrel exports** — add to `src/server/services/index.ts`

---

## Sources

### Primary (HIGH confidence)
- Bitsgap Advanced Grid Settings docs — arithmetic/geometric parameters, trailing, pump protection
- 3Commas Grid Bot settings help center — full parameter list, geometric vs arithmetic breakdown
- T-Invest/T-Bank Dev Portal limits documentation — 900 orders/min, 100 cancels/min confirmed
- Bybit Spot Grid P&L documentation — `GridProfit = sellQty * sellPrice * (1-fee) - buyQty * buyPrice`
- Gainium grid profit calculation docs — per-grid profit formula cross-verification
- Nikofischer grid trading implementation guide — state management pattern, order lifecycle

### Secondary (MEDIUM confidence)
- Veles Finance website — platform overview, trading modes (Simple/Own/Signal), commission structure
- KuCoin Grid Bot documentation — AI Plus parameter adjustment, confirmation UX
- Pionex blog grid trading guide — AI 2.0 strategy, ATR-based range suggestion, 7/30/180d lookbacks
- 3Commas arithmetic vs geometric blog — formula comparison, market suitability
- MQL5 MOEX grid trading article — grid trading on Moscow Exchange mechanics and risks

### Tertiary (LOW confidence)
- TradeSanta vs Cryptohopper comparison (CaptainAltcoin) — UX critique, no visualization weakness
- Quadency comparison articles — poor grid UX documented by multiple reviewers

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in existing package.json, no new deps needed
- Grid algorithm: HIGH — arithmetic/geometric formulas verified across 4+ sources
- P&L formula: HIGH — verified from Bybit official docs + Bitsgap documentation
- Architecture: HIGH — follows existing project patterns (service/repository/action layers)
- Competitor UX: MEDIUM-HIGH — direct documentation access for 3Commas/Bitsgap; Pionex/Veles partially blocked
- MOEX feasibility: MEDIUM — T-Invest API limits confirmed, practical MOEX grid constraints from MQL5 article
- AI param suggestion: MEDIUM — Pionex/KuCoin approach documented, ATR calculation confirmed via trading-signals

**Research date:** 2026-03-28
**Valid until:** 2026-06-28 (90 days — grid trading algorithm is stable, library versions are pinned)
