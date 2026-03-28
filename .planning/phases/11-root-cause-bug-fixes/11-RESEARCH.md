# Phase 11: Root Cause Bug Fixes — Research

**Researched:** 2026-03-27
**Domain:** Full-stack bug root cause analysis — AI wizard flow, terminal stats, portfolio amounts, Telegram notifications, strategy lifecycle, operation data
**Confidence:** HIGH — all findings based on direct code inspection

---

## Summary

Seven bugs were traced end-to-end through the full data and UI stack. Each root cause was located at its owner layer: contract, service, UI state binding, or missing feature. No patches or compensations were found — every bug has a clean fix point.

The most systemic issue is BUG 1 (AI wizard): the "Create Strategy" quick action button fires `sendMessage` with `forceCreate: true`, which correctly triggers the DeepSeek tool call and yields a `strategy` chunk — but `AiChat.handleQuickAction` calls `onGenerated` which calls `setPendingFormData` AND advances to `step: "form"` immediately inside `useAiStream.finally`. The actual problem is that `handleStrategyGenerated` is wired to `onGenerated` in `AiChat`, but the "Создать эту стратегию" quick action calls `sendMessage` again with `forceCreate: true` — it does NOT call `onGenerated` directly. It waits for the stream to complete, and only if the SSE yields a `strategy` chunk will `onStrategyExtracted` fire (for preview panel), but `onGenerated` is only called from `handleApply` inside the inline `StrategyPreview` component, not from the quick action path. This is the full break.

**Primary recommendation:** Fix each bug at its owner layer. No cross-layer patches.

---

## Bug 1: AI Wizard "Create Strategy" Button Does Nothing

### Symptom
Clicking "Создать эту стратегию" quick action button in AiChat (step: strategy) appears to send a message but does not advance the wizard to `step: "form"`.

### Full Data Flow Trace

**Top-down:**
```
AiWizardDialog (step="strategy")
  └── AiChat key={chatKey}
        onGenerated={handleStrategyGenerated}   ← advances to form step
        onStrategyExtracted={setExtractedStrategy}
        └── QuickActionButtons
              action={action} onAction={handleQuickAction}
                └── handleQuickAction (ai-chat.tsx:117)
                      action.action === "CREATE"
                        → sendMessage("Да, создай эту стратегию", { forceCreate: true })
```

**Bottom-up (what `sendMessage` with `forceCreate: true` actually does):**
```
useAiStream.sendMessage(text, { forceCreate: true })
  → POST /api/ai/chat  { forceCreate: true }
  → route.ts  → provider.chatWithThinking(messages, forceCreate=true)
  → deepseek-provider.ts:needsToolCall() → true
  → non-streaming tool_call path
  → yields { type: "strategy", content: JSON.stringify(parsed) }
  → useAiStream SSE reader: chunk.type === "strategy"
      → pendingStrategy = parsed
      → onStrategyExtracted?.(pendingStrategy)   ← fires preview update ONLY
  → finally block: assistantMsg = { strategy: pendingStrategy, actions: STRATEGY_QUICK_ACTIONS }
      → setMessages([...prev, assistantMsg])
      ← returns to AiChat — no call to onGenerated
```

### Root Cause

`ai-chat.tsx:handleQuickAction` sends a new AI message but never calls `onGenerated`. The `onGenerated` callback (which routes to `handleStrategyGenerated` → `setPendingFormData` → `setStep("form")` in the wizard) is wired only through `handleApply`, which is triggered by the **inline `StrategyPreview` component's "Применить стратегию" button** rendered when `msg.strategy` is set.

The quick action "Создать эту стратегию" was intended to be a shortcut to skip the "Применить" step, but `handleQuickAction` (`ai-chat.tsx:117`) only calls `sendMessage` — it never calls `onGenerated(pendingStrategy)`.

**Two separate paths exist that are not connected:**
- Path A: `handleApply` → `setFromAI(strategy.config)` → `onGenerated(strategy)` — works, advances wizard
- Path B: quick action "CREATE" → `sendMessage(forceCreate)` → gets strategy back from AI → stops at `onStrategyExtracted` — does NOT call `onGenerated`

### Fix Location
**`src/components/strategy/ai-chat.tsx`, `handleQuickAction` (line 117)**

When `action.action === "CREATE"` and the AI returns a strategy (detected in `sendMessage`'s finally block via `pendingStrategy`), `onGenerated` must be called. Two options:
1. In `handleQuickAction`, after `sendMessage` resolves, check if the last message has `msg.strategy` and call `onGenerated(strategy)`.
2. Expose a callback from `useAiStream` that fires `onGenerated` when a strategy chunk arrives with `forceCreate` active.

The cleanest fix: `useAiStream.sendMessage` should accept an `onStrategyReady` callback (or return the strategy), so the caller (`handleQuickAction`) can invoke `onGenerated` directly after `forceCreate` resolves.

**Why other layers are unaffected:** The DeepSeek provider, route handler, and `useAiStream` all work correctly. The break is purely in the `AiChat` → wizard callback wiring.

---

## Bug 2: Terminal % Does Not Change With Chart Period

### Symptom
The `change` % shown in `PriceBar` is always daily session change (from MOEX session open at 10:00 MSK). Switching chart period (1m, 5m, 1h, 1w) does not affect the % displayed.

### Full Data Flow Trace

**Top-down:**
```
terminal/page.tsx
  handleInstrumentSelect(inst)
    → fetchDailyStats(inst.figi)           ← called ONCE on instrument select
    → setDailyStats(res.data)

  NO effect from period change:
  handlePeriodChange(p) → setPeriod(p)     ← only updates chart candles
                                           ← does NOT trigger fetchDailyStats

  computation (lines 245-249):
    const sessionOpen = dailyStats?.sessionOpen ?? 0
    const change = sessionOpen > 0 ? ((currentPrice - sessionOpen) / sessionOpen) * 100 : 0
```

**Bottom-up (what `getDailySessionStatsAction` returns):**
```
getDailySessionStatsAction(figi)
  → BrokerService.getCandles(userId, { interval: "1m", from: sessionStartUtc, to: today })
     sessionStartUtc = today at 07:00 UTC (= 10:00 MSK, always today's MOEX session open)
  → aggregateSessionStats(candles)
     returns { sessionOpen: candles[0].open, high: max(all highs), low: min(all lows), volume: sum }
```

### Root Cause

`getDailySessionStatsAction` is hardcoded to fetch 1-minute candles from today's MOEX session open (07:00 UTC). It always returns the session open price regardless of which chart period the user has selected.

The page only calls `fetchDailyStats` inside `handleInstrumentSelect` (line 199). There is no re-fetch when `period` changes (line 225–227 only calls `setPeriod`). Therefore `change` is always "vs today's session open" — the daily session %.

**For period-based %**, `sessionOpen` would need to be the price at the start of the selected period:
- 1m period → change from 1 hour ago (not session open)
- 1h period → change from 30 days ago first candle
- 1w → change from 1 year ago first candle

The current `DailySessionStats` type has no concept of "period open" — it only has `sessionOpen` (today 10:00 MSK).

### Fix Location
**`src/server/actions/chart-actions.ts` (getDailySessionStatsAction) AND `src/app/(dashboard)/terminal/page.tsx`**

The action must accept a `period` parameter to compute period-based open:
- For 1m/5m/15m/1h periods: session stats are appropriate (intraday, session open makes sense)
- For 1d/1w periods: the `periodOpen` should be the first candle's open in the chart's candle range

The page must re-fetch stats when `period` changes (add `period` dependency to `fetchDailyStats` or the `useEffect` that calls it).

**Why other layers are unaffected:** `PriceBar` is purely presentational — it renders whatever `change` it receives. `aggregateSessionStats` is also correct for daily use. Only the action and page need updating.

---

## Bug 3: Portfolio Shows Budget (30,000₽) Not Real Amounts

### Symptom
`PaperPortfolioView` "Вложено" column shows round numbers like 30,000₽ — the strategy's budget setting — instead of the actual sum of executed operations.

### Full Data Flow Trace

**Top-down:**
```
PaperPortfolioView
  → getPaperPortfolioAction()
      row.stats.initialAmount   ← displayed as "Вложено" (line 164)
```

**Bottom-up (`initialAmount` source):**
```
getPaperPortfolioAction (no date filter path, line 85):
  stats = await operationService.getStats(s.id, currentPrice)

OperationService.getStats (operation-service.ts:34):
  ops = await this.repo.getStatsByStrategyId(strategyId)
  totalBuyAmount = sum of op.amount for all BUY ops
  return { initialAmount: totalBuyAmount, ... }

OperationService.recordOperation (operation-service.ts:7):
  const amount = input.tradeAmount ?? 10_000
  const quantity = Math.floor(amount / input.price)
  const actualAmount = quantity * input.price   ← actual traded amount
  repo.create({ amount: actualAmount, ... })
```

**Where does 30,000₽ come from?**

`recordOperation` is called from `StrategyTriggerHandler.handle` (line 48):
```
tradeAmount: config.risks.tradeAmount
```

`config.risks.tradeAmount` is stored in the strategy config (e.g. 30,000₽). This is used to compute `quantity = floor(30000 / price)`, then `actualAmount = quantity * price`.

For example: price = 300₽, tradeAmount = 30,000₽ → quantity = 100, actualAmount = 100 * 300 = 30,000₽ exactly (when price divides evenly).

So the 30,000₽ **IS** the actual computed amount in this case — it equals the budget when the price divides the budget cleanly. The symptom "budget not real amounts" is most likely a UI labeling issue: the column says "Вложено" showing `initialAmount` (which is the actual amount spent on buys), but Anton expects to see smaller amounts like 9,780₽.

**Discrepancy origin:** If a strategy has `tradeAmount: 30,000₽` but the actual buy was at 307.80₽, then `quantity = floor(30000/307.80) = 97 lots`, `actualAmount = 97 * 307.80 = 29,856.60₽`. But if price is 307₽ exactly, `quantity = 97`, `actualAmount = 29,779₽`. So the actual amount stored IS the real trade amount.

**The real bug:** `initialAmount` is the cumulative sum of all BUY `amount` values — if a strategy has made multiple buys (3 buys × ~9,780₽ each ≈ 29,340₽), the "Вложено" column shows the total invested across all trades, not the current position value. Anton may be seeing the **first individual trade** amount as 9,780₽ but the column showing the cumulative total.

Alternatively, `currentAmount` in `OperationStats` (line 85 of operation-service.ts) = `holdingQty * currentPrice` (the current marked-to-market position value), which would be the "real amount currently held". The column shows `initialAmount` (what was spent), not `currentAmount` (what it's worth now).

### Fix Location
**`src/components/broker/paper-portfolio-view.tsx`, line 164** — label "Вложено" and its value source.

The column should show `stats.currentAmount` (current position market value) for open positions and `stats.initialAmount` for closed ones. Or always show `currentAmount` as "Текущая стоимость". This is a display choice, not a data bug — the data is computed correctly.

**Why other layers are unaffected:** `OperationService.getStats` correctly computes both `initialAmount` (cost basis) and `currentAmount` (market value). The fix is in the component's choice of which field to display and how to label it.

---

## Bug 4: Telegram Notifications Missing Trade Amounts

### Symptom
Telegram notifications do not include entry price, exit price, or P&L in rubles for trade events.

### Full Data Flow Trace

**Strategy notifications (`StrategyTriggerHandler.handle`, lines 67–86):**
```
BUY (isEntry = true):
  message = result.message
    = formatStrategyNotification(strategy, "entry", ctx)   ← from strategy-checker.ts:129
    includes: ticker, ВХОД (BUY), price, conditions, time
    DOES NOT include: tradeAmount, quantity

  NO additional enrichment for entry trades
  → telegram.send(chatId, message)

SELL (isEntry = false):
  message enriched (lines 68–85):
    if buyPrice > 0:
      message += P&L in ₽ and %
      message += "Вход: X₽ → Выход: Y₽"
  → telegram.send(chatId, message)
```

**`formatStrategyNotification` (notification-templates.ts:312):**
```
returns: ticker, side label, current price, conditions list, time
MISSING: tradeAmount (how much was spent), quantity (how many lots)
```

**Signal notifications (`SignalTriggerHandler.handle`):**
```
result.message = formatSignalNotification(signal, ctx)
  → includes price, indicator values, time
  → DOES NOT include tradeAmount (signals don't trade)
```

### Root Cause

**For strategies:**
- Entry notifications never include trade amount or quantity. The `config.risks.tradeAmount` is available in `StrategyTriggerHandler.handle` via `config.risks.tradeAmount` but is not passed to `formatStrategyNotification`.
- Exit notifications do include P&L and buy→sell price, but only per-lot price delta — not the total ₽ P&L based on actual quantity traded.

The `formatStrategyNotification` function signature only receives `(strategy, side, ctx)`. `ctx` has `price` and `candles` but not `tradeAmount` or `quantity`. The actual operation just recorded (with `actualAmount` and `quantity`) is not passed to the notification formatter.

**Concrete missing data:**
- Entry: "Куплено: 97 лотов на 29,779₽" — neither quantity nor total amount is in the message
- Exit: P&L is computed from price delta × 1 (per-share), not × quantity, so total ₽ P&L is wrong for multi-lot trades

### Fix Location
**`src/server/services/strategy-trigger-handler.ts`, `handle` method (lines 67–91)**

After `recordOperation` succeeds (line 55), the returned operation object has `quantity` and `amount`. These should be threaded into the notification message:
- Entry: append "Куплено: {quantity} лотов на {amount}₽"
- Exit: compute total P&L as `(sellPrice - buyPrice) * quantity` instead of `sellPrice - buyPrice`

The `formatStrategyNotification` template itself may also need updating to accept optional `{ quantity, tradeAmount }` extras.

**`src/server/services/notification-templates.ts`, `formatStrategyNotification`** — extend signature to accept trade details.

**Why other layers are unaffected:** `SignalTriggerHandler` handles signals (no trading, no amounts needed). `TelegramProvider.send` is a passthrough. The bug is solely in the data assembled before calling `send`.

---

## Bug 5: Strategy Not Auto-Stopped at Broker on Delete

### Symptom
Deleting a strategy removes it from the database but does not cancel any pending orders or subscriptions at the broker.

### Full Data Flow Trace

**Top-down:**
```
strategies/page.tsx handleDelete(id)
  → deleteStrategyAction(id)
      → StrategyService.deleteStrategy(id, userId)
          → StrategyRepository.delete(id, userId)
              → supabase.from("Strategy").delete().eq("id", id).eq("userId", userId)
```

**What does NOT happen:**
- No call to `deactivateStrategy` before delete
- No call to broker to cancel orders
- No removal of Redis price-stream subscription
- No update to `positionState`

**For comparison, deactivation path:**
```
deactivateStrategyAction(id)
  → StrategyService.deactivateStrategy(id, userId)
      → repository.update(id, userId, { status: "PAUSED" })
      ← status set to PAUSED, StrategyChecker skips PAUSED strategies
```

**StrategyChecker.getActiveStrategies (strategy-checker.ts:133):**
```
.eq("status", "ACTIVE")
← only fetches ACTIVE strategies, so PAUSED/DELETED won't be checked
```

### Root Cause

`deleteStrategy` directly removes the DB row. If the strategy was `ACTIVE` at delete time:
1. `StrategyChecker` won't check it next cycle (row is gone) — this is benign for future cycles
2. BUT: if a check is in progress when delete fires, the lock (`acquireLock`) will block it, but the strategy state (positionState = OPEN) is deleted along with the row — no broker cancel is issued
3. More critically: there is no broker-level cancel. This project uses paper trading (OperationService) — there are no real broker orders to cancel. The "broker subscription" referred to in the bug description is likely the Redis-based price stream subscription (`subscribeInstrumentAction` in terminal), not real broker orders.

**For paper trading, the actual risk is:**
- Strategy deleted while `positionState = "OPEN"` → the open position record is gone, but the operation records in the `Operation` table remain (orphaned, since `strategyId` FK cascade delete handles them depending on schema)

**The real missing step:** Before deleting, the system should set `status: "PAUSED"` first to ensure any in-flight checker cycle sees PAUSED and skips it.

### Fix Location
**`src/server/services/strategy-service.ts`, `deleteStrategy` method (line 70)**

Before calling `repository.delete`, call `repository.update(id, userId, { status: "PAUSED" })` to ensure the checker won't process it during deletion. If real broker orders exist in future, add a broker cancel step here.

**`src/server/actions/strategy-actions.ts`, `deleteStrategyAction` (line 88)**

Verify cascade delete behavior for operations — if not cascade, explicitly delete related operations or accept orphans.

**Why other layers are unaffected:** `StrategyChecker` works correctly — it only processes ACTIVE strategies. The fix is adding a pre-delete deactivation step to the service layer.

---

## Bug 6: Operation Volume Not in Trade Units

### Symptom
Paper portfolio table shows operation count (e.g., "3") but does not show the volume in trade units (lots × lot size).

### Full Data Flow Trace

**`PaperPortfolioView` table columns (lines 137–144):**
```
col 1-2: Стратегия
col 3: Инструмент
col 4: Операций         ← shows stats.totalOperations (count)
col 5: Вложено          ← shows stats.initialAmount (₽)
col 6: P&L ₽
col 7: P&L %
col 8: Статус
```

**Data available in `OperationStats` (from `OperationService.getStats`):**
```
{
  totalOperations: number,    ← count of all ops
  buyCount: number,
  sellCount: number,
  initialAmount: number,      ← total ₽ spent on buys
  currentAmount: number,      ← current market value
  holdingQty: number,         ← net quantity currently held
  pnl: number,
  pnlPercent: number,
  lastBuyPrice: number,
}
```

`holdingQty` IS available — it represents the net quantity (lots) currently held. However:
- Lot size is not stored in `OperationStats`
- The `StrategyOperation` record has `quantity` (number of lots) but no `lotSize` multiplier
- Trade units = quantity × lotSize (e.g., for SBER lotSize = 10, quantity = 10 lots = 100 shares)

### Root Cause

The "Операций" column in `PaperPortfolioView` shows `stats.totalOperations` (integer count of trade events). The quantity data (`holdingQty`) exists in `OperationStats` but is not displayed in the paper portfolio table.

The lot size metadata is on `BrokerInstrument.lot` but is not included in `PaperStrategyRow` returned by `getPaperPortfolioAction`.

### Fix Location
**`src/components/broker/paper-portfolio-view.tsx`** — add a "Кол-во" column showing `row.stats.holdingQty` (or total bought quantity for closed positions).

**`src/server/actions/paper-portfolio-actions.ts`** — optionally include `lotSize` per instrument if actual trade units (not lot count) are needed. The broker price fetch already has instrument lookup — `lot` property can be included.

**`src/server/actions/paper-portfolio-actions.ts`, `PaperStrategyRow` type** — extend with `lotSize?: number` if needed for unit display.

**Why other layers are unaffected:** `OperationService` already computes `holdingQty`. The missing piece is purely UI: the column is not rendered.

---

## Bug 7: Strategy Card Position Amount != Operations Sum

### Symptom
Strategy card shows "Позиция: X₽" (currentAmount) but this value doesn't match what the user sees when expanding the operations detail or checking paper portfolio.

### Full Data Flow Trace

**Strategy card rendering (`strategy-card.tsx`, lines 129–133):**
```
{stats.holdingQty > 0 ? (
  "Позиция: {stats.currentAmount} ₽"
  + "{stats.pnl} ₽ ({stats.pnlPercent}%)"
)}
```

**`stats.currentAmount` source (`operation-service.ts:85`):**
```
currentAmount: holdingQty > 0 && currentPrice ? holdingQty * currentPrice : 0
```

`currentPrice` comes from `getOperationStatsForStrategiesAction` which fetches via `BrokerService.getInstrumentPrice(userId, instrument)`.

**Paper portfolio view:**
```
Same stats object from OperationService.getStats, same computation.
But paper portfolio shows stats.initialAmount ("Вложено"), not stats.currentAmount.
```

**The mismatch scenarios:**

1. **No current price available** → `currentAmount = 0` despite having `holdingQty > 0`. Card shows "Позиция: 0.00₽". This happens when broker price fetch fails.

2. **Price used in card vs portfolio differs** → strategies/page.tsx fetches price via `getOperationStatsForStrategiesAction` (uses `BrokerService.getInstrumentPrice`). Paper portfolio fetches price via `getPaperPortfolioAction` (also uses `BrokerService.getInstrumentPrice` but at a different time, so stale vs fresh price mismatch).

3. **currentAmount vs initialAmount confusion** → Card shows `currentAmount` (market value of holding) as "Позиция", while portfolio shows `initialAmount` (cost basis) as "Вложено". These are intentionally different numbers but users interpret them as "the same thing".

### Root Cause

**Primary root cause:** `stats.currentAmount = holdingQty * currentPrice` is computed with a live price fetched at request time. If price is unavailable (broker error, no connection), `currentPrice = undefined`, so `currentAmount = 0`. The strategy card then shows "Позиция: 0.00₽" instead of the cost basis.

**Secondary root cause:** `stats.initialAmount` (what was paid, reliable) and `stats.currentAmount` (current market value, unreliable if no price) represent different things but are both used to answer "how much money is in this position", causing confusion when they differ.

`strategies/page.tsx:59–68` (portfolioSummary computation) also sums `config.risks.tradeAmount` (the budget setting, not actual operations) for "Размер портфеля стратегий" — mixing budget with actual amounts in the same UI.

### Fix Location
**`src/components/strategy/strategy-card.tsx`, lines 129–133:**
- When `currentAmount === 0` and `holdingQty > 0`, fall back to displaying `initialAmount` (cost basis) as position value, labeled as "Вложено (по цене входа)".
- This prevents the confusing "0₽" display.

**`src/server/actions/operation-actions.ts`, `getOperationStatsForStrategiesAction`:**
- When price fetch fails, fall back to `lastBuyPrice` for currentAmount estimation: `currentAmount = holdingQty * lastBuyPrice` (cost basis estimate).

**`src/app/(dashboard)/strategies/page.tsx`, `portfolioSummary`, line 60–62:**
- Replace `config.risks.tradeAmount` sum with `opsStatsMap` total: `sum(stats.initialAmount)` — actual invested, not budget.

**Why other layers are unaffected:** `OperationService.getStats` logic is correct — it computes `currentAmount` as `holdingQty * currentPrice` which is standard. The bug is in the failure case (null price) not having a fallback display.

---

## File Reference Map

| Bug | File | Lines | Layer |
|-----|------|-------|-------|
| BUG 1 | `src/components/strategy/ai-chat.tsx` | 117–124 | UI — quick action handler missing `onGenerated` call |
| BUG 1 | `src/hooks/use-ai-stream.ts` | 57–165 | Hook — `sendMessage` returns void, strategy not surfaced |
| BUG 2 | `src/app/(dashboard)/terminal/page.tsx` | 179–200, 225–249 | Page — `fetchDailyStats` not called on period change |
| BUG 2 | `src/server/actions/chart-actions.ts` | 19–48 | Action — hardcoded to today's MOEX session open |
| BUG 3 | `src/components/broker/paper-portfolio-view.tsx` | 163–164 | UI — shows `initialAmount` labeled ambiguously as "Вложено" |
| BUG 4 | `src/server/services/strategy-trigger-handler.ts` | 44–65, 67–86 | Service — entry notification missing quantity/amount; exit P&L ignores quantity |
| BUG 4 | `src/server/services/notification-templates.ts` | 312–344 | Template — `formatStrategyNotification` has no trade amount param |
| BUG 5 | `src/server/services/strategy-service.ts` | 70–73 | Service — `deleteStrategy` does not deactivate before deleting |
| BUG 5 | `src/server/actions/strategy-actions.ts` | 88–98 | Action — no pre-delete status update |
| BUG 6 | `src/components/broker/paper-portfolio-view.tsx` | 137–145 | UI — `holdingQty` column absent |
| BUG 7 | `src/components/strategy/strategy-card.tsx` | 129–133 | UI — no fallback when `currentAmount = 0` |
| BUG 7 | `src/server/actions/operation-actions.ts` | 51–86 | Action — no price fallback for `currentAmount` |
| BUG 7 | `src/app/(dashboard)/strategies/page.tsx` | 60–62 | Page — `totalPortfolio` uses budget not actual invested |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Strategy chunk surfacing in hook | New SSE event bus | Return `pendingStrategy` from `sendMessage` or add callback param | Already has SSE parsing infrastructure |
| Lot size lookup | New DB table | `BrokerInstrument.lot` from existing broker call in `getPaperPortfolioAction` | Already fetched in the same action |

---

## Common Pitfalls

### Pitfall 1: Fix BUG 1 in the Hook, Not the Component
**What goes wrong:** Adding `onGenerated` call inside `useAiStream.sendMessage` (the hook) breaks the abstraction — the hook doesn't know about wizard navigation.
**How to avoid:** Keep the fix in `ai-chat.tsx` — after `sendMessage` resolves, check if a strategy was returned and call `onGenerated`. Return the strategy from `sendMessage` or pass a `onStrategyReady` callback.

### Pitfall 2: BUG 2 Period % for Daily/Weekly Candles
**What goes wrong:** Using the chart's first candle's `open` as the "period open" works for 1m/5m intervals but for 1d/1w intervals `candles[0].open` might be from 365 days ago.
**How to avoid:** Define period open as: the chart's **last candle's open** (today's open) for intraday, or specifically `PERIOD_CONFIG[period].days` ago for daily/weekly.

### Pitfall 3: BUG 7 Fallback to lastBuyPrice vs initialAmount
**What goes wrong:** Using `lastBuyPrice * holdingQty` as fallback doesn't account for multiple buys at different prices.
**How to avoid:** Use `stats.initialAmount` (which is already the sum of all BUY amounts) as the cost-basis display value when `currentAmount = 0`. It represents what was actually paid.

### Pitfall 4: BUG 4 P&L Computation Uses Price Delta Not Amount Delta
**What goes wrong:** In `strategy-trigger-handler.ts:82`, `const pnl = result.price - buyPrice` computes per-share P&L, but the notification shows "P&L: +X₽" which users interpret as total P&L.
**How to avoid:** After `recordOperation` succeeds, the returned operation has `quantity`. Total P&L = `(result.price - buyPrice) * quantity`.

### Pitfall 5: BUG 5 Race Between Delete and In-Flight Check
**What goes wrong:** Setting status to PAUSED before delete is safe only if the StrategyChecker's lock is respected. If a check cycle is mid-execution (after locking but before reading status), the strategy row may be deleted mid-check.
**How to avoid:** The existing Redis lock in `StrategyChecker.checkAll` prevents concurrent processing. The deactivate-then-delete sequence is sufficient — the next check cycle won't pick up a PAUSED strategy.

---

## Architecture Notes

### AiChat Strategy Flow — Two Paths That Must Converge

There are currently two ways to accept a strategy in AiChat:

1. **Inline StrategyPreview "Применить" button** (`msg.strategy` → `handleApply` → `onGenerated`)
2. **Quick action "Создать эту стратегию"** (`handleQuickAction` → `sendMessage(forceCreate)` → pending strategy in hook → STOPS here)

Path 2 was added in Phase 08 as a convenience shortcut but was never wired to `onGenerated`. The fix must ensure path 2 terminates at the same endpoint as path 1.

### Terminal Period % — Feature vs Bug

The current behavior (always daily %) is technically correct for the daily stats feature added in Phase 09. Anton's request is a new requirement: show "change since start of selected chart period". This is a feature addition on top of a working daily stats system, not a pure bug fix. The plan should treat it as: extend `getDailySessionStatsAction` to accept optional `period` parameter and compute `periodOpen` from candles.

### Notification Trade Amounts — Entry vs Exit Asymmetry

The exit notification already has enrichment (P&L, buy→sell price, lines 68–85) but entry notifications have none. The enrichment pattern from exit can be replicated for entry: after `recordOperation` returns, append "Куплено: {op.quantity} лотов на {op.amount}₽" to the message.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection — all file:line references verified by reading source
- `src/hooks/use-ai-stream.ts` — strategy chunk handling and `onStrategyExtracted` vs `onGenerated` paths
- `src/components/strategy/ai-chat.tsx` — `handleQuickAction` and `handleApply` paths
- `src/app/(dashboard)/terminal/page.tsx` — `fetchDailyStats` call site and `change` computation
- `src/server/actions/chart-actions.ts` — `getDailySessionStatsAction` hardcoded session start
- `src/server/services/operation-service.ts` — `initialAmount` and `currentAmount` definitions
- `src/server/services/strategy-trigger-handler.ts` — entry/exit notification enrichment asymmetry
- `src/server/services/strategy-service.ts` — `deleteStrategy` with no deactivation step
- `src/components/broker/paper-portfolio-view.tsx` — column definitions

## Metadata

**Confidence breakdown:**
- Bug root causes: HIGH — all verified by tracing actual code paths
- Fix locations: HIGH — single-file or two-file changes, no architectural rewrites needed
- Side effects: MEDIUM — BUG 5 race condition analysis is conservative; actual DB cascade behavior for Operation rows on Strategy delete not verified (check Prisma schema)

**Research date:** 2026-03-27
**Valid until:** Until any of the traced files are modified
