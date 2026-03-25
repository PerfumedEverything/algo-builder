# Pitfalls Research

**Domain:** AI-augmented algo trading platform — adding free-form AI dialog, correlation matrix, Markowitz optimization, MOEX sector mapping, terminal top movers
**Researched:** 2026-03-25
**Confidence:** HIGH (based on direct codebase audit + domain experience)

---

## Critical Pitfalls

### Pitfall 1: AI Triggers `create_strategy` Too Early in Free-Form Dialog

**What goes wrong:**
The current `CHAT_SYSTEM_PROMPT` instructs DeepSeek to call `create_strategy` "when it has collected enough information." With free-form dialog, users will describe abstract ideas ("I want something like what Buffett does but shorter term") and the model will prematurely fire the tool call after the first message that sounds concrete, skipping clarification that would produce a better strategy. The user sees a strategy appear before they feel heard.

**Why it happens:**
The system prompt rule "if the user immediately described a specific strategy — generate immediately" is ambiguous. "RSI strategy on Sber" reads as specific enough to the model even though the user hasn't confirmed timeframe, risk appetite, or position sizing. DeepSeek is aggressive about tool calls when `tool_choice` is left as `auto` and a tool is available.

**How to avoid:**
- Add an explicit "minimum turns" gate in the system prompt: require at least one exchange confirming instrument + trading style before calling `create_strategy`, unless the user has provided all four parameters (ticker, timeframe, style, risk level) in a single message.
- Add a confirmation step: before calling the tool, the AI should summarize parameters and ask "Генерирую стратегию с этими параметрами?". Only call the tool after user says yes (or sends a follow-up message that confirms).
- Alternatively, use a two-stage approach: chat until parameters are confirmed, then call a separate `generate` endpoint with `tool_choice: { type: "function", function: { name: "create_strategy" } }` (forced), so the chat phase is purely conversational.

**Warning signs:**
- Users see a strategy card appear on their first or second message without being asked about risk.
- AI generates a strategy with `1d` timeframe defaulting when the user said "quick trades."
- Users complain the AI "doesn't listen."

**Phase to address:** AI Revolution phase (Phase 1)

---

### Pitfall 2: AI Keeps Chatting After Confirming Strategy (Late Generation)

**What goes wrong:**
The opposite failure: the AI collects instrument, style, and risk but then continues asking follow-up questions ("Would you like me to add volume confirmation?") indefinitely instead of calling `create_strategy`. Users get impatient waiting for a concrete output.

**Why it happens:**
The model's tendency to be thorough. With `temperature: 0.7` and no hard exit condition, the model finds more questions to ask. The current system prompt says "4. When you have collected enough information — call create_strategy" without defining "enough."

**How to avoid:**
- Define "enough" explicitly in the system prompt: "After collecting instrument + timeframe + risk level (3 parameters), always call create_strategy. Do not ask additional questions beyond these three."
- Add a fallback: if the conversation is > 6 turns and no strategy has been generated, the UI should show a "Сгенерировать стратегию" button that forces generation via the direct `generateStrategy` path (which uses `tool_choice: forced`).

**Warning signs:**
- Chat threads with > 5 user messages that have not produced a strategy card.
- Users clicking away from the chat tab.

**Phase to address:** AI Revolution phase (Phase 1)

---

### Pitfall 3: Function Calling Response Has `content: null` When Tool Is Called

**What goes wrong:**
When DeepSeek calls `create_strategy`, the `choice.content` field is `null`. The current code has `choice.content || "Готово! Вот ваша стратегия:"` which handles this, but when moving to free-form dialog with a persistent chat thread, the tool_call message must be included in subsequent `messages` array with `content: null` — if it is omitted or set to `""`, the API returns a 400 error on the next turn.

**Why it happens:**
OpenAI API spec requires that when a tool_call is made, the assistant message must be included in history with the exact tool_calls array, and a subsequent `tool` role message with the tool result. DeepSeek follows the same spec. If the frontend only stores `{ role: "assistant", content: message }` and strips the tool_call, the next API call will fail.

**How to avoid:**
- In `AiChatMessage` type and the messages array sent to the API, preserve the full assistant message including `tool_calls` when a strategy was generated.
- When replaying history to the API, include a synthetic `{ role: "tool", tool_call_id: ..., content: "Strategy created successfully" }` after each strategy generation turn.
- Simpler alternative: reset the conversation context after strategy generation — start a new session with just the user's current message, since strategy creation is a terminal action.

**Warning signs:**
- API 400 errors on the second strategy generation in the same session.
- "AI не ответил" errors that only appear in multi-turn conversations.

**Phase to address:** AI Revolution phase (Phase 1)

---

### Pitfall 4: Correlation Matrix — Division by Zero for Tickers With Constant Price

**What goes wrong:**
Pearson correlation formula requires dividing by `std(a) * std(b)`. If any position has zero price variance over the selected period (e.g., a money market fund, newly added position with one data point, or a bond with stable price), `stdDev` returns 0 and the correlation becomes `NaN`. This propagates through the entire matrix and makes `@nivo/heatmap` render blank cells or throw.

**Why it happens:**
`simple-statistics` `sampleCorrelation` throws if standard deviation is 0. The existing `risk-calculations.ts` has a `if (std === 0) return 0` guard for Sharpe, but a new correlation function will need the same treatment.

**How to avoid:**
```typescript
const safePearson = (a: number[], b: number[]): number => {
  const stdA = standardDeviation(a)
  const stdB = standardDeviation(b)
  if (stdA === 0 || stdB === 0) return 0 // no correlation if flat
  return sampleCorrelation(a, b)
}
```
Return 0 (not NaN) for flat series — they have no measurable relationship. Display such cells with a distinct color or tooltip "недостаточно данных".

**Warning signs:**
- NaN values in the correlation matrix object.
- `@nivo/heatmap` renders white/empty cells.
- Console errors from nivo about invalid data range.

**Phase to address:** Portfolio Depth phase (Phase 3)

---

### Pitfall 5: Correlation Matrix — Misaligned Return Series (Different Trading Days)

**What goes wrong:**
Different instruments trade on different days: MOEX stocks skip holidays, but a user's portfolio may include currency pairs or instruments from different boards. If you zip daily returns by index rather than by date, the series are misaligned, producing mathematically meaningless (and often spuriously high) correlations.

**Why it happens:**
The existing `alignByDate` function in `risk-calculations.ts` handles this correctly for portfolio vs. benchmark, but a naive implementation of "compute daily returns for each ticker then correlate" will skip date alignment. T-Invest candle API returns dates in response; MOEX ISS returns `begin` and `end` fields.

**How to avoid:**
- Reuse the existing `alignByDate` pattern: build `Map<string, number>` (date → return) for each ticker, then intersect all dates before computing correlations.
- Only use trading days where ALL tickers in the matrix have data (inner join, not outer join).
- Minimum overlap check: if two tickers share fewer than 20 aligned data points, set correlation to null (not 0) and display "мало данных."

**Warning signs:**
- SBER-GAZP correlation shows 0.99 (perfect correlation) — usually a sign of index-matched series without date alignment.
- Pairs involving recently-bought positions show unexpectedly high or low correlations.

**Phase to address:** Portfolio Depth phase (Phase 3)

---

### Pitfall 6: Markowitz — Corner Solutions (100% in One Asset)

**What goes wrong:**
Standard Markowitz optimization with only a "maximize Sharpe" objective and no weight constraints will almost always produce corner solutions: 0% in most assets and 100% in the asset with the highest historical risk-adjusted return. This is mathematically correct but practically useless — users see "put everything in SBER" and distrust the tool.

**Why it happens:**
Unconstrained quadratic programming on a small MOEX portfolio with short history (< 1 year) will overfit to the recent winner. Russian market has high volatility, making the efficient frontier strongly peaked at corner solutions.

**How to avoid:**
- Always apply weight constraints: minimum 5% per position (force diversification), maximum 40% per position.
- Apply a regularization term (L2 on weights) to pull solution toward equal weighting when data is sparse.
- Show the result as a "suggested rebalancing" range, not a single point: "оптимальный вес SBER: 25-35%."
- Display the current portfolio weights alongside optimized weights so users see what would change, not just the end state.
- Practical constraint: sum of weights = 1, each weight >= 0 (no shorts) enforced hard.

**Warning signs:**
- Any single weight showing > 80% in the output.
- Optimization result identical for very different portfolios.

**Phase to address:** Portfolio Depth phase (Phase 3)

---

### Pitfall 7: Markowitz — Numerical Instability in Covariance Matrix Inversion

**What goes wrong:**
If two positions have near-perfect correlation (> 0.98), the covariance matrix becomes near-singular. Matrix inversion (required for Sharpe maximization) will produce extreme weights with opposite signs: +300% in one asset, -280% in another. This looks like unrealistic short positions appearing despite the no-shorts constraint being set at the optimization level.

**Why it happens:**
JavaScript has no native matrix algebra library that handles near-singular cases gracefully. Using a naive implementation from scratch or a lightweight math library without regularization will fail silently, producing numerically valid but semantically absurd weights.

**How to avoid:**
- Use `numeric.js` or `ml-matrix` (both available on npm) which have Cholesky decomposition that detects and rejects near-singular matrices.
- Add Tikhonov regularization: add a small epsilon (0.001) to diagonal of covariance matrix before inversion — this is standard practice in portfolio optimization.
- Pre-check: if any pair has `|correlation| > 0.95`, warn the user "Эти активы высококоррелированны — оптимизация может быть неточной" and show the pair.
- If inversion fails, fall back to equal-weight portfolio and display an explanation.

**Warning signs:**
- Weights summing to more than 100% or less than 100% by large margins.
- Negative weights appearing despite no-shorts constraint.
- `Infinity` or `NaN` in weight arrays.

**Phase to address:** Portfolio Depth phase (Phase 3)

---

### Pitfall 8: MOEX Sector Mapping — ETFs and Multi-Sector Instruments

**What goes wrong:**
The MOEX ISS `securities` endpoint returns a `SECTOR` field for stocks, but ETFs (FXUS, TMOS, SBSP, etc.) either return null sector or return a generic "ETF" category. A portfolio with 30% in ETFs will have 30% uncategorized in sector allocation, making the pie chart look incomplete and the analysis unreliable.

**Why it happens:**
ISS API has incomplete sector data for ETFs by design — they span multiple sectors. Moex also returns Russian-language sector names inconsistently: "Финансы" vs "Финансовый сектор" vs "Банки" for the same sector across different time periods.

**How to avoid:**
- Build a static fallback mapping for top 50 MOEX tickers by market cap (covers 80% of retail portfolios): `{ SBER: "Финансы", GAZP: "Энергетика", ... }`. Hard-code this in `src/core/config/sector-map.ts`.
- For ETFs: create a separate "ETF" category and display their underlying exposure if known (TMOS = Russian market broad, FXUS = US market). Show ETFs as their own segment rather than trying to decompose them.
- Normalize ISS sector names to a fixed canonical set before display.
- For unknown tickers not in static map and not returned by ISS: show "Прочее" — do not break the chart.

**Warning signs:**
- Sector allocation showing > 20% "Неизвестно" for a typical Russian retail portfolio.
- Pie chart colors changing between renders due to inconsistent sector names.

**Phase to address:** Portfolio Depth phase (Phase 3)

---

### Pitfall 9: Top Movers — Stale Data Outside MOEX Trading Hours

**What goes wrong:**
The current `getTopMovers` caches with `EX: 60` (60 seconds TTL). Outside MOEX trading hours (09:50–18:50 MSK, Mon–Fri), the data is stale but still returned as if current. `LASTCHANGEPRCNT` from ISS reflects the last trading day's change, not real-time movement. Users see "top movers" that haven't moved in hours and can't tell if the data is fresh.

**Why it happens:**
The MOEX ISS marketdata endpoint always returns the last available data — it does not distinguish between "market is open" and "market is closed." The 60-second cache TTL was designed for intraday use only.

**How to avoid:**
- Detect market hours server-side: MOEX trades Mon–Fri 09:50–18:50 Moscow time. Outside these hours, extend cache TTL to match the time until next session open (to avoid repeated ISS calls for stale data).
- Add a `marketIsOpen: boolean` and `dataDate: string` field to the `TopMover` API response.
- Display a "Данные за [дата]" label in the UI when market is closed, and show a "Биржа закрыта" badge instead of pretending data is live.
- Do NOT show percentage changes as "today's change" when the market is closed — relabel as "Изменение за последнюю сессию."

**Warning signs:**
- Top movers list showing the same tickers at the same percentages across multiple refreshes outside market hours.
- Users asking "почему топ не меняется?"

**Phase to address:** Terminal Depth phase (Phase 2)

---

### Pitfall 10: Top Movers — ISS Returns Null for Recently Listed Instruments

**What goes wrong:**
`LAST` and `LASTCHANGEPRCNT` are `null` in the ISS response for instruments that had no trades today (new listings, suspended trading, or extremely illiquid stocks). The current `buildTopMovers` filter (`r.LAST !== null && r.LASTCHANGEPRCNT !== null`) correctly removes these, but if the filter leaves fewer than `topN` valid results, `valid.slice(-topN).reverse()` for losers will overlap with gainers in edge cases.

**Why it happens:**
During low-liquidity sessions (holidays, half-days), many small-cap instruments have null trades. The slice logic assumes at least `2 * topN` valid instruments.

**How to avoid:**
- Add a guard: `if (valid.length < topN * 2) topN = Math.floor(valid.length / 2)`.
- Add a volume filter: require `VOLTODAY > 0` in addition to non-null price to exclude instruments that technically have a last price but zero turnover today.
- Display a "Недостаточно данных" placeholder when fewer than 3 gainers/losers can be shown.

**Warning signs:**
- Gainers and losers lists sharing the same tickers.
- Empty top movers section during early morning or on half-trading days.

**Phase to address:** Terminal Depth phase (Phase 2)

---

### Pitfall 11: AI Free-Form Dialog — Context Window Blowup With Portfolio Data

**What goes wrong:**
The new AI dialog will need to reference portfolio data (positions, P&L, risk metrics) to answer questions like "which of my positions has the highest risk?" If the full portfolio data is injected into every message as a system context blob, a portfolio of 20 positions with history data will easily exceed 10,000 tokens per request, increasing cost and latency significantly. With the existing 50k char limit, this is technically allowed, but 20+ message conversations with full portfolio context repassed each time will hit it.

**Why it happens:**
Stateless server actions mean the full context must be re-sent on each turn. The existing `chatStrategyAction` sends all previous messages, and adding portfolio context on top makes each subsequent turn heavier.

**How to avoid:**
- Inject portfolio context only once as a system message at the start of the conversation, not on every turn.
- Summarize positions: send ticker, weight, P&L% per position — not full operation history. Full history is only needed for the "lot analysis" block (which has its own separate action).
- Cap portfolio context at 30 positions × ~50 chars each = ~1500 chars. If user has more, send top 10 by value.
- Use the existing `AiAnalysisBlock` system for deep analysis — free-form chat is for discussion, not heavy data processing.

**Warning signs:**
- Response latency > 5 seconds for normal questions.
- 50k char limit errors appearing in chat.
- Costs increasing disproportionately.

**Phase to address:** AI Revolution phase (Phase 1)

---

### Pitfall 12: Cohort Analysis — Defining Cohorts Without Clear Business Logic

**What goes wrong:**
"Cohort analysis" is ambiguous in a trading context. Without a crisp definition upfront, the implementation drifts into something that looks like a table but doesn't answer a real question. Common mistake: grouping by sector or instrument type and showing average P&L per group, which users immediately compare to simple filtering they can already do in the portfolio table.

**Why it happens:**
The feature is listed as "когортный анализ" in requirements without specifying the cohort dimension. Developers default to "group by sector" which is just a pivot table.

**How to avoid:**
- Define cohorts specifically before implementation: "group positions by entry date bucket (this week / this month / this quarter / this year)" OR "group by holding period (< 1 week, 1 week–1 month, > 1 month)" — these answer real trader questions about whether short-term or long-term trades are more profitable.
- The most actionable cohort for this platform: **holding period vs. P&L outcome** — shows users whether their trades held longer or shorter than X days perform better.
- Avoid sector cohorts as a standalone chart — sector allocation already covers this.

**Warning signs:**
- Cohort chart looks identical to the sector allocation chart.
- Users can't articulate what question the cohort answers.

**Phase to address:** Portfolio Depth phase (Phase 3)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-coded sector map for MOEX tickers | No ISS API call needed for sectors | Must be maintained manually when companies change sectors | Acceptable for MVP — update quarterly |
| Equal-weight fallback when Markowitz fails | Always shows something | Users may not know optimization failed | Acceptable if failure is clearly communicated in UI |
| Fixed 60-second TTL for top movers regardless of market hours | Simple caching | Stale data UX during closed market | Not acceptable — market hours check costs ~5 lines |
| Resetting chat context after strategy creation | Avoids tool_call history complexity | User can't continue conversation about the strategy they just created | Acceptable for Phase 1, revisit in v1.2 |
| Inject full portfolio context into every AI chat message | Simple stateless implementation | Cost and latency scale with conversation length | Not acceptable for conversations > 5 turns |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| DeepSeek function calling | Omitting the assistant tool_call message from history on next turn | Preserve full `tool_calls` array in message history OR reset context after tool call |
| DeepSeek free-form chat | Sending `tool_choice: "auto"` with a tool always available causes premature calls | Use `tool_choice: "none"` during exploratory turns, switch to `"auto"` only when parameters confirmed |
| MOEX ISS top movers | Treating `LASTCHANGEPRCNT` as real-time during closed market | Add market hours detection and label data as "last session" |
| MOEX ISS sector data | Relying on ISS `SECTOR` field for all instruments | Build static fallback map; ISS sector is unreliable for ETFs and newer listings |
| `@nivo/heatmap` | Passing NaN values in data — heatmap renders blank or throws | Validate all correlation values before passing to nivo; replace NaN with 0 and mark cell |
| `simple-statistics sampleCorrelation` | Calling with a series of length < 3 or zero variance — throws | Guard with length check and stdDev > 0 check before calling |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Computing correlation matrix client-side for large portfolios | UI freezes for 1–2 seconds | Move to server action; matrix computation is O(n²) but n is small (< 50 positions) — acceptable server-side | At 30+ positions with 1-year daily data |
| Fetching T-Invest candles for every position on every portfolio load | 10+ sequential API calls on page load | Cache candle data in Redis with 1-hour TTL; fetch only positions whose cache is stale | At 10+ positions without caching |
| Passing full conversation history to DeepSeek on each chat turn | Latency grows linearly with conversation length | Cap history at last 10 turns (5 user + 5 assistant) for chat; full history only for strategy generation | At turn 8+ |
| Re-computing Markowitz optimization synchronously in API route | Response timeout on VPS | Run as background job with result stored in Redis; return cached result | With 20+ positions and 1-year history |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing raw AI output directly to strategy `validateConfig` without sanitizing | AI could generate a strategy config with prototype pollution or excessively large arrays | The existing `validateConfig` in `deepseek-provider.ts` already guards indicator/condition enums — ensure array length is also bounded (max 10 conditions) |
| Exposing full portfolio data in AI prompt without userId verification | If AI chat action doesn't check auth, user data is exposed | Already guarded by `getCurrentUserId()` in all server actions — verify this is added to new AI chat action |
| Accepting arbitrary ticker symbols from AI output for sector mapping lookup | Ticker could be crafted to cause object injection | Validate ticker against `^[A-Z0-9]{1,12}$` regex before lookup — same pattern already used in `getDividends` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing Markowitz weights as exact numbers (SBER: 27.34%) | Users trust false precision; small data set doesn't support 2 decimal places | Show as ranges or rounded to 5%: "SBER: 25–30%"; explain "рекомендация, не точный сигнал" |
| Correlation matrix with no explanation of what -1 / 0 / +1 means | Non-technical users don't know if high correlation is good or bad | Add a color legend with brief labels: "движутся вместе / независимо / противоположно" |
| AI chat that resets conversation history when user navigates away | User loses context, frustrating for multi-step discussions | Persist last N messages in sessionStorage or Zustand; restore on component mount |
| Top movers without volume data visible | Users can't distinguish genuine moves from low-liquidity noise | Show volume alongside % change; flag if volume < 10% of 30-day average |
| Cohort chart without date range selector | Cohort results depend heavily on selected period; without control, users can't interpret | Always pair cohort analysis with date range filter matching the portfolio date filter |

---

## "Looks Done But Isn't" Checklist

- [ ] **AI free-form dialog:** Strategy cards generated — verify the tool_call message is included in history for subsequent turns, or conversation resets cleanly after generation
- [ ] **AI free-form dialog:** Test conversation > 5 turns — verify no 400 errors from DeepSeek on messages with prior tool_calls
- [ ] **Correlation matrix:** Verify all cells with < 20 shared data points show "мало данных" not a spurious number
- [ ] **Correlation matrix:** Test portfolio with one flat-price position (e.g., bond) — verify no NaN in output
- [ ] **Markowitz:** Test with two highly correlated positions (SBER + VTBR) — verify no negative weights appear
- [ ] **Markowitz:** Test with 2-position portfolio — verify corner solution warning is shown, not just "100% SBER"
- [ ] **MOEX sector map:** Test portfolio containing TMOS or FXUS ETF — verify "ETF" category appears, not a crash
- [ ] **Top movers:** Check behavior at 19:00 MSK — verify "Биржа закрыта" label shown and cache is extended
- [ ] **Top movers:** Test on a holiday — verify empty or low-result list handled gracefully
- [ ] **AI context size:** Verify chat with portfolio context passed stays under 50k chars for a 20-position portfolio over 10 turns

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AI fires `create_strategy` too early | LOW | Update `CHAT_SYSTEM_PROMPT` — no code changes to tool definition needed |
| NaN in correlation matrix breaks nivo heatmap | LOW | Add sanitization function before nivo data binding — 10-line fix |
| Markowitz producing negative weights | MEDIUM | Add constraint enforcement post-optimization: clip negatives to 0, renormalize — 20-line fix |
| Sector map missing 50% of portfolio tickers | MEDIUM | Extend static map + add ISS fallback fetch — 1-2 hours work |
| Tool_call history causing 400 errors | MEDIUM | Add context reset after strategy creation OR implement proper tool message insertion — 30-line fix |
| Markowitz optimization timeout on VPS | HIGH | Requires adding Redis job queue pattern — architectural change |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AI triggers `create_strategy` too early | Phase 1: AI Revolution | Test "I want something like Buffett" — must ask at least 1 clarifying question |
| AI keeps chatting without generating | Phase 1: AI Revolution | Test providing ticker + style + risk in one message — must generate within 2 turns |
| Tool_call history causes 400 errors | Phase 1: AI Revolution | Send 10-message conversation, generate strategy, send 2 more messages — no errors |
| Context window blowup with portfolio data | Phase 1: AI Revolution | Verify request size < 10k tokens for 20-position portfolio over 10 turns |
| Correlation matrix NaN/division by zero | Phase 3: Portfolio Depth | Test with flat-price position in portfolio — all cells show valid numbers |
| Misaligned return series | Phase 3: Portfolio Depth | Compare SBER-GAZP correlation to known financial data — should be ~0.6-0.8 |
| Markowitz corner solutions | Phase 3: Portfolio Depth | Verify no single position weight exceeds 40% in output |
| Markowitz near-singular covariance | Phase 3: Portfolio Depth | Test with 2 near-identical positions — result is warning, not crash |
| MOEX sector ETF gap | Phase 3: Portfolio Depth | Portfolio with TMOS shows "ETF" category in sector chart |
| Top movers stale data | Phase 2: Terminal Depth | Check response at 20:00 MSK — `marketIsOpen: false` in response |
| Top movers null instruments | Phase 2: Terminal Depth | Simulate empty ISS response — UI shows placeholder, not crash |
| Cohort undefined business logic | Phase 3: Portfolio Depth | Cohort chart answers "do longer-held positions perform better?" — user can state this |

---

## Sources

- Direct audit of `/src/server/providers/ai/deepseek-provider.ts` — existing function calling implementation
- Direct audit of `/src/server/services/risk-calculations.ts` — existing `alignByDate`, `standardDeviation` usage
- Direct audit of `/src/server/providers/analytics/moex-provider.ts` — existing top movers and ISS integration
- OpenAI function calling spec (tool_call message format in multi-turn conversations) — HIGH confidence
- MOEX ISS API behavior for closed market and ETF sector fields — MEDIUM confidence (from ISS docs + direct integration experience)
- Markowitz optimization numerical stability — HIGH confidence (standard portfolio theory)
- `simple-statistics` sampleCorrelation edge cases — HIGH confidence (library source code behavior)
- `@nivo/heatmap` NaN handling — MEDIUM confidence (known nivo issue with invalid data ranges)

---
*Pitfalls research for: AculaTrade v1.1 — AI Revolution + Deep Analytics milestone*
*Researched: 2026-03-25*
