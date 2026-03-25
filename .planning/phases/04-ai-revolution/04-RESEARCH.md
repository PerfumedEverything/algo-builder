# Phase 4: AI Revolution - Research

**Researched:** 2026-03-25
**Domain:** AI chat strategy creation, indicator expansion, terminal-to-chat context seeding
**Confidence:** HIGH

## Summary

Phase 4 extends the existing AI chat strategy pipeline in three directions. First, it upgrades the chat from a rigid 4-step quiz pattern to a true free-form conversation where AI extracts parameters progressively — the current `AiChat` + `DeepSeekProvider.chatAboutStrategy` already support multi-turn dialog but the system prompt enforces a sequential question order. The upgrade is primarily a system prompt change plus a live preview panel rendered in parallel with the chat.

Second, it seeds the `StrategyDialog` and `SignalDialog` with the AI technical analysis result when opened from the terminal "Create Strategy" / "Create Signal" buttons. Currently the terminal buttons open both dialogs without any pre-filled context. The AI analysis text is available via `buildChartMessage()` and the `analyzeWithAiAction` result, but is not passed downstream.

Third, it adds ATR, Stochastic, VWAP, and Williams %R as first-class indicators. The `technicalindicators` library (v3.1.0, already installed) provides all four. The `IndicatorCalculator`, `crossing-detector`, `indicators.ts` config, and Zod schemas all need consistent updates. The `BETWEEN` condition type is already in the enum but lacks a `valueTo` field in the schema and UI — this must be added.

**Primary recommendation:** Divide into 4 focused tasks: (1) live preview panel + free-form AI prompt upgrade, (2) terminal context seeding for strategy and signal creation, (3) new indicator implementations, (4) BETWEEN/percent condition UI completion.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AIREV-01 | User can create strategy through free-form dialog — AI auto-generates strategy params when enough context gathered | Existing `chatAboutStrategy` + system prompt change + no-quiz initial message |
| AIREV-02 | User sees live strategy preview updating as AI fills parameters during conversation | New `StrategyPreviewPanel` component rendered alongside `AiChat`, updated on each `AiChatResponse.strategy` |
| AIREV-03 | User can click "Create Strategy from Analysis" after AI technical analysis in terminal | Pass AI analysis text as `initialContext` prop to `StrategyDialog`; seed `AiChat` messages |
| AIREV-04 | User can click "Create Signal from Analysis" after AI technical analysis in terminal | Pass AI analysis text as `initialContext` prop to `SignalDialog`; seed AI to suggest conditions |
| AIREV-05 | User can use expanded set of indicators (ATR, Stochastic, VWAP, Williams %R) in strategy conditions | `technicalindicators` v3.1.0 already supports all four — add to `IndicatorCalculator`, `crossing-detector`, `indicators.ts`, schemas |
| AIREV-06 | User can use expanded set of conditions (BETWEEN range, percent-based thresholds) in strategy builder | BETWEEN is in enum but missing `valueTo` field; `ABOVE_BY_PERCENT`/`BELOW_BY_PERCENT` already exist in enum and `compareCondition` — missing only from UI config for new indicators |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| technicalindicators | 3.1.0 (installed) | ATR, Stochastic, VWAP, WilliamsR calculation | Already in project, all 4 new indicators confirmed working |
| openai (OpenAI SDK) | 6.31.0 (installed) | DeepSeek API via OpenAI-compatible interface | Current AI provider pattern |
| zustand | 5.0.11 (installed) | Strategy store state (live preview state) | Already used in `use-strategy-store` |
| zod | 4.3.6 (installed) | Schema validation for new indicator conditions | Project-wide validation standard |

### No New Packages Needed
All required functionality exists in the current stack. No new npm installs required for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| technicalindicators built-ins | Custom math | technicalindicators already proven, tested, in project — no reason to hand-roll |
| Server Action for chat | SSE streaming | Out of scope per REQUIREMENTS.md: "Streaming AI responses for strategy gen — Server Actions sufficient" |

## Architecture Patterns

### Recommended Project Structure Changes
```
src/
├── core/types/strategy.ts          # Add ATR | STOCHASTIC | VWAP | WILLIAMS_R to IndicatorType
│                                   # Add valueTo?: number to StrategyCondition
├── core/schemas/strategy.ts        # Mirror type changes in Zod schemas
├── core/config/indicators.ts       # Add 4 new IndicatorConfig entries
├── server/services/
│   ├── indicator-calculator.ts     # Add calculateATR, calculateStochastic, calculateVWAP, calculateWilliamsR
│   └── crossing-detector.ts        # Add 4 new cases to getIndicatorValue(), BETWEEN to compareCondition
├── server/providers/ai/
│   └── deepseek-provider.ts        # Update system prompts + tool schema for new indicators + free-form mode
├── components/strategy/
│   ├── ai-chat.tsx                 # Remove quiz pattern, add free-form prompt, emit partial strategy for preview
│   ├── strategy-dialog.tsx         # Accept initialContext?: string prop, seed AI chat
│   └── strategy-preview-panel.tsx  # NEW: live preview sidebar/panel
├── components/signal/
│   └── signal-dialog.tsx           # Accept initialContext?: string prop, seed AI suggestion
├── components/shared/
│   └── condition-builder.tsx       # Add BETWEEN dual-value UI (value + valueTo inputs)
└── app/(dashboard)/terminal/
    └── page.tsx                    # Capture AI analysis result, pass as initialContext to dialogs
```

### Pattern 1: Live Strategy Preview Panel (AIREV-02)
**What:** A side panel or collapsible section in `StrategyDialog` that renders the last extracted `AiGeneratedStrategy` in real time as the chat accumulates messages.
**When to use:** Shown only when at least one `AiChatResponse.strategy` has been returned.
**Implementation approach:**
- `AiChat` currently calls `onGenerated(strategy)` only when user clicks "Apply". For AIREV-02 we emit the strategy to a `onStrategyExtracted` callback on every assistant message that contains a strategy — not just on apply.
- `StrategyDialog` holds `extractedStrategy` state, passes it to a new `StrategyPreviewPanel` rendered in a collapsible below the chat.
- The preview panel re-uses the existing `StrategyPreview` inline component but promotes it to a standalone component with richer display.

### Pattern 2: Terminal Context Seeding (AIREV-03, AIREV-04)
**What:** When user clicks "Create Strategy" or "Create Signal" after AI analysis in terminal, the AI analysis text is injected as the first assistant message in the dialog chat.
**When to use:** When analysis has been performed and `strategyDialogOpen` / `signalDialogOpen` is set to true.
**Implementation approach:**
```typescript
// terminal/page.tsx — capture analysis result
const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null)

// AiAnalysisButton needs an onResult callback
analyzeAction={() => analyzeWithAiAction("chart", buildChartMessage())}
onResult={(result) => setAiAnalysisResult(result)}

// Pass to dialog
<StrategyDialog
  open={strategyDialogOpen}
  onOpenChange={setStrategyDialogOpen}
  initialContext={aiAnalysisResult ?? undefined}
  onSuccess={() => setStrategyDialogOpen(false)}
/>
```
- `StrategyDialog` passes `initialContext` to `AiChat` as the initial assistant message (injected before `INITIAL_MESSAGE`)
- `AiChat` checks `initialContext` prop: if set, first message is the analysis text with label "Анализ из терминала:" and chat starts with instrument pre-filled
- `SignalDialog` mirrors this pattern with a prompt seeded to suggest signal conditions matching the analysis

### Pattern 3: New Indicator Implementation (AIREV-05)
**What:** ATR, Stochastic, VWAP, Williams %R added to the full indicator pipeline: types → schemas → calculator → crossing-detector → indicators config → AI tool schema.
**Confirmed API (verified against installed library v3.1.0):**
```typescript
// ATR — needs high, low, close arrays + period
ATR.calculate({ high, low, close, period }) // returns number[]

// Stochastic — needs high, low, close + period + signalPeriod
Stochastic.calculate({ high, low, close, period, signalPeriod })
// returns { k: number, d: number }[] — use k value for conditions

// VWAP — needs high, low, close, volume arrays
VWAP.calculate({ high, low, close, volume })
// returns number[]

// Williams %R — needs high, low, close + period
WilliamsR.calculate({ high, low, close, period })
// returns number[] — range -100 to 0; -80 = oversold, -20 = overbought
```
All four return arrays; use `[result.length - 1]` for the latest value.

### Pattern 4: BETWEEN Condition with valueTo (AIREV-06)
**What:** BETWEEN requires two threshold values (low, high). The current `StrategyCondition` has only `value?: number`. A `valueTo?: number` field must be added.
**Schema change:**
```typescript
// core/types/strategy.ts
export type StrategyCondition = {
  indicator: IndicatorType
  params: Record<string, number>
  condition: ConditionType
  value?: number
  valueTo?: number  // ADD: upper bound for BETWEEN
  timeframe?: string
}
```
**Zod schema change:**
```typescript
// core/schemas/strategy.ts
export const strategyConditionSchema = z.object({
  ...
  valueTo: z.number().optional(),  // ADD
})
```
**crossing-detector.ts change:**
```typescript
// In compareCondition, add BETWEEN case:
case "BETWEEN":
  if (target2 === undefined) return false
  return actual >= target && actual <= target2
```
`target2` = `condition.valueTo` — needs to be threaded through `evaluateCondition`.

**ConditionBuilder UI change:** When `condition === "BETWEEN"`, show two value inputs: "От" (value) and "До" (valueTo).

### Anti-Patterns to Avoid
- **Streaming for strategy generation:** Out of scope. Server Actions return full response — do not add SSE/ReadableStream.
- **Replacing the quiz with a single-prompt form:** AIREV-01 requires free-form conversation, not another one-shot generator. Keep the multi-turn `chatAboutStrategy` path.
- **Adding valueTo to DB schema:** `StrategyCondition` is a JSONB column in Supabase — schema changes are in TypeScript types only, no DB migration needed. The JSONB field is schemaless.
- **Separate AI endpoints for terminal context:** Reuse `chatStrategyAction` with pre-seeded messages instead of new server actions.
- **Hand-rolling technical indicators:** `technicalindicators` already ships ATR, Stochastic, VWAP, WilliamsR — confirmed in codebase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ATR calculation | Custom ATR math | `technicalindicators.ATR` | Already in project, verified working |
| Stochastic oscillator | Custom %K/%D | `technicalindicators.Stochastic` | Returns `{k, d}` object correctly |
| VWAP calculation | Custom VWAP | `technicalindicators.VWAP` | Needs high/low/close/volume — library handles it |
| Williams %R | Custom WR math | `technicalindicators.WilliamsR` | Range -100 to 0, library verified |

**Key insight:** All 4 new indicators are already available in the installed `technicalindicators@3.1.0`. The implementation is purely additive — no new dependencies, no math library needed.

## Common Pitfalls

### Pitfall 1: BETWEEN condition missing valueTo in DB JSONB records
**What goes wrong:** After adding `valueTo` to the TypeScript schema, existing conditions in the DB have no `valueTo`. Code that assumes `valueTo` is defined for BETWEEN will crash when reading old strategies.
**Why it happens:** JSONB is schemaless — old records won't have the new field.
**How to avoid:** Always use optional chaining and guard: `if (condition.valueTo === undefined) return false` in `compareCondition` for BETWEEN.
**Warning signs:** Runtime errors like "Cannot read property of undefined" in strategy checker logs.

### Pitfall 2: Stochastic %K vs %D confusion
**What goes wrong:** Using the `d` value instead of `k` for the condition evaluation, leading to lagged signals.
**Why it happens:** `Stochastic.calculate` returns `{k, d}` — it's not immediately obvious which to use.
**How to avoid:** Use `k` (raw stochastic) for condition evaluation. Expose `signalPeriod` param to allow smoothing. Document this in the indicator config description.

### Pitfall 3: VWAP candle count requirement
**What goes wrong:** VWAP returns a value for every candle (no minimum period), but if called with only 1 candle it returns just the mid-price (H+L+C)/3 * volume which may not be meaningful.
**Why it happens:** VWAP is session-based by nature — best when computed across a trading session's candles.
**How to avoid:** Require at least 5 candles before returning a VWAP value. Guard: `if (candles.length < 5) return null`.

### Pitfall 4: AI chat free-form → tool_choice must remain optional
**What goes wrong:** The current `chatAboutStrategy` always allows the AI to optionally call `create_strategy` (no forced `tool_choice`). If you force `tool_choice` to `create_strategy` in free-form mode, the AI will try to generate a strategy on every turn even when asking clarifying questions.
**Why it happens:** The current code correctly sets `tool_choice` to auto (default) for chat — keep it that way.
**How to avoid:** Keep `tool_choice` unset (auto) in chat mode. Only force it in `generateStrategy` (single-prompt mode).

### Pitfall 5: Terminal `AiAnalysisButton` does not expose the result
**What goes wrong:** `AiAnalysisButton` currently performs analysis internally and displays it inline. It does not return the analysis text to the parent page. AIREV-03/04 requires capturing that text to seed the dialogs.
**Why it happens:** The component was designed for display only, not for passing data up.
**How to avoid:** Add an optional `onResult?: (result: string) => void` callback prop to `AiAnalysisButton`. The terminal page uses this to store the analysis text in local state.

### Pitfall 6: DeepSeek tool schema not updated for new indicators
**What goes wrong:** The `generateStrategyTool` in `deepseek-provider.ts` has `VALID_INDICATORS` hardcoded. If ATR/Stochastic/VWAP/WilliamsR are not added there, AI will never generate strategies using them.
**Why it happens:** The AI's knowledge of what indicators are valid is bound to the function schema enum.
**How to avoid:** Update `VALID_INDICATORS` array in `deepseek-provider.ts` to include all 4 new types. Also update `CHAT_SYSTEM_PROMPT` to mention them as available options.

## Code Examples

### ATR in IndicatorCalculator
```typescript
// Source: technicalindicators v3.1.0 verified against installed package
import { ATR } from "technicalindicators"

static calculateATR(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null
  const result = ATR.calculate({
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    period,
  })
  return result[result.length - 1] ?? null
}
```

### Stochastic in IndicatorCalculator
```typescript
// Source: technicalindicators v3.1.0
import { Stochastic } from "technicalindicators"

static calculateStochastic(candles: Candle[], period = 14, signalPeriod = 3): number | null {
  if (candles.length < period + signalPeriod) return null
  const result = Stochastic.calculate({
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    period,
    signalPeriod,
  })
  const last = result[result.length - 1]
  return last?.k ?? null
}
```

### VWAP in IndicatorCalculator
```typescript
// Source: technicalindicators v3.1.0
import { VWAP } from "technicalindicators"

static calculateVWAP(candles: Candle[]): number | null {
  if (candles.length < 5) return null
  const result = VWAP.calculate({
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    volume: candles.map((c) => c.volume),
  })
  return result[result.length - 1] ?? null
}
```

### Williams %R in IndicatorCalculator
```typescript
// Source: technicalindicators v3.1.0
import { WilliamsR } from "technicalindicators"

static calculateWilliamsR(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null
  const result = WilliamsR.calculate({
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    period,
  })
  return result[result.length - 1] ?? null
}
```

### BETWEEN in compareCondition (crossing-detector.ts)
```typescript
// Current signature needs extending
export const compareCondition = (
  actual: number,
  condition: string,
  target: number,
  currentPrice?: number,
  target2?: number,  // ADD: upper bound for BETWEEN
): boolean => {
  switch (condition) {
    case "BETWEEN":
      if (target2 === undefined) return false
      return actual >= target && actual <= target2
    // ... existing cases
  }
}
```

### Free-form AI system prompt (key change for AIREV-01)
The key change is removing the rigid 4-step order and replacing it with:
```
Ты — AI-помощник AculaTrade. Помогай пользователю создать торговую стратегию через свободный диалог.
Когда у тебя достаточно информации (инструмент + хоть какой-то стиль или индикатор), вызови create_strategy.
Не задавай все вопросы по порядку — реагируй на то, что написал пользователь.
Если пользователь сразу описал идею с деталями — сразу генерируй.
Если описание расплывчатое — уточни ОДНО самое важное.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential quiz (4 fixed questions) | Free-form conversation, AI extracts params | Phase 4 | Faster strategy creation, less friction |
| No context from terminal to dialogs | Analysis text seeds AI chat | Phase 4 | User doesn't re-describe the instrument they just analyzed |
| 10 indicator types | 14 indicator types (+ ATR, Stochastic, VWAP, WR) | Phase 4 | Richer strategy conditions |
| BETWEEN condition in enum but unusable (no second value) | BETWEEN with valueTo field in schema + dual-input UI | Phase 4 | Range conditions actually work |

## Open Questions

1. **Should "Create Strategy from Analysis" pre-fill the instrument in the dialog form?**
   - What we know: Terminal has `instrument` state with `ticker` value. `StrategyDialog` opens `StrategyForm` which has an `InstrumentSelect`.
   - What's unclear: Whether to auto-populate the instrument field when `initialContext` is provided.
   - Recommendation: Yes — pass the current terminal `ticker` as `initialInstrument` to `StrategyDialog`. This is simple and significantly improves UX.

2. **Should Stochastic expose both %K and %D as separate indicators, or just one "STOCHASTIC" type?**
   - What we know: `Stochastic.calculate` returns `{k, d}`. Most strategies use %K with %D confirmation.
   - What's unclear: Whether power users need separate access to %D.
   - Recommendation: Single `STOCHASTIC` indicator using %K value. Keep it simple for v1.1. %D can be added later.

3. **Should the live preview panel (AIREV-02) be a sidebar or a collapsible section?**
   - What we know: `StrategyDialog` uses `max-w-2xl` with `overflow-y-auto`. Adding a sidebar would require layout refactor.
   - Recommendation: Collapsible section below the chat, shown only when a strategy has been extracted. Avoids layout refactor, consistent with current dialog width.

## Environment Availability

Step 2.6: SKIPPED — no new external dependencies. All required packages (`technicalindicators`, `openai`, `zustand`, `zod`) are already installed and verified.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts (or package.json scripts) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AIREV-05 | ATR returns null when insufficient candles | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| AIREV-05 | ATR returns correct value for known candle data | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| AIREV-05 | Stochastic %K in range 0-100 | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| AIREV-05 | VWAP returns null when < 5 candles | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| AIREV-05 | Williams %R in range -100 to 0 | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| AIREV-06 | BETWEEN returns true when value is within range | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| AIREV-06 | BETWEEN returns false when valueTo is undefined | unit | `npm run test -- --reporter=verbose` | ❌ Wave 0 |
| AIREV-01/02/03/04 | AI chat, preview panel, context seeding | manual-only | — | — |

**Manual-only justification for AIREV-01 through AIREV-04:** These require AI API calls (DeepSeek), dialog state, and live browser interaction. Unit testing the system prompt changes would require mocking the full OpenAI SDK. The project pattern (per SESSION.md memory `feedback_skip_tests_small_changes`) is to push directly for minimal UI changes and verify visually.

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/indicator-calculator-new.test.ts` — covers AIREV-05 (ATR, Stochastic, VWAP, WilliamsR)
- [ ] `src/__tests__/crossing-detector-between.test.ts` — covers AIREV-06 (BETWEEN condition logic)

## Sources

### Primary (HIGH confidence)
- `technicalindicators` v3.1.0 — verified via `node -e` against installed package: ATR, Stochastic, VWAP, WilliamsR all confirmed as `function` type and return correct values
- Project source files read directly: `indicator-calculator.ts`, `crossing-detector.ts`, `deepseek-provider.ts`, `ai-chat.tsx`, `strategy-dialog.tsx`, `terminal/page.tsx`, `indicators.ts`, `strategy.ts` (types + schemas)

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md — "Streaming AI responses for strategy gen — Server Actions sufficient, SSE adds complexity without UX benefit" (explicit out-of-scope decision)
- STATE.md — "DeepSeek context reset after strategy creation defers multi-turn refinement — clarify with Anton if needed"

### Tertiary (LOW confidence)
- None — all findings directly from codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and verified
- Architecture: HIGH — implementation paths clearly traced through existing code
- Pitfalls: HIGH — identified from direct code reading, not speculation
- New indicator API: HIGH — verified with Node.js execution against installed package

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable stack, no moving parts)
