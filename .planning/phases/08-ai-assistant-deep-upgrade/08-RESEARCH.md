# Phase 8: AI Assistant Deep Upgrade - Research

**Researched:** 2026-03-27
**Domain:** DeepSeek API (thinking mode), Next.js 15 streaming, AI chat UX, context assembly, backtest integration
**Confidence:** HIGH (architecture patterns from codebase) / MEDIUM (DeepSeek thinking + streaming)

---

## Project Constraints (from CLAUDE.md)

- OOP with classes for services and providers
- No comments in code
- Max 150 lines per file — split large files
- Server Actions: always `await getCurrentUserId()` first
- Every entity action must verify userId ownership
- AI prompts: limit input length (50k chars max)
- TypeScript strict mode, no `any`
- Tailwind utility classes only, Lucide icons only
- Barrel exports (index.ts) for each module
- Early return instead of nested if
- No default exports except page.tsx, layout.tsx

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AIUP-01 | AI uses thinking/reasoning step before responding | DeepSeek `deepseek-reasoner` model — separate `reasoning_content` field in response |
| AIUP-02 | AI receives volume, order book, and current positions alongside OHLC | Context assembly service — extend `chatStrategyAction` with enriched context object |
| AIUP-03 | AI can analyze senior timeframe for multi-timeframe confirmation | Fetch candles at 2 timeframes: current + one level up, include both in AI context |
| AIUP-04 | Quick action buttons after AI proposes strategy | Chat message type extended with `actions?: QuickAction[]`; client renders buttons in message bubble |
| AIUP-05 | AI responses stream character by character | Route Handler `/api/ai/chat` with `ReadableStream` + SSE; client uses `EventSource` or `fetch` stream reader |
| AIUP-06 | AI sees current portfolio positions, warns about concentration/correlation | `getPortfolio()` result included in system prompt context; `PortfolioHealthService` summary injected |
| AIUP-07 | AI has access to fundamental data (P/E, dividends) | `FundamentalService.getMetrics()` already exists — call per instrument discussed in chat |
| AIUP-08 | After strategy creation, user sees backtest preview | `BacktestService.runBacktest()` is fully implemented; call after strategy creation in wizard step 3 |
| AIUP-09 | User can continue conversation after strategy creation | Keep `messages[]` state across wizard steps; "strategy created" becomes a system message in history |
</phase_requirements>

---

## Summary

Phase 8 upgrades the AI chat from a stateless request-response system into a stateful, context-rich, streaming trading advisor. The current implementation (`DeepSeekProvider.chatAboutStrategy`) makes a single blocking call to `deepseek-chat` with only the conversation history — no market data, no portfolio, no fundamentals. The response arrives only when fully complete.

The upgrade has two distinct technical tracks:

**Track A — Streaming:** Replace the Server Action (`chatStrategyAction`) with an API Route Handler at `/api/ai/chat` that returns a `ReadableStream` SSE response. The client uses `fetch` with a streaming reader to render characters as they arrive. This is the standard pattern for OpenAI-compatible streaming in Next.js 15 App Router.

**Track B — Thinking mode:** Use `deepseek-reasoner` model instead of `deepseek-chat` for analysis queries. CRITICAL CONSTRAINT: `deepseek-reasoner` does NOT support function calling/tool_calls. This means the strategy generation tool call (`create_strategy`) cannot run through the reasoner. The solution is a two-phase approach: (1) use `deepseek-reasoner` for analysis and discussion, (2) switch to `deepseek-chat` with tool_calls for the final strategy creation step only.

**Primary recommendation:** Implement streaming first via Route Handler + SSE, then layer in context enrichment (portfolio, fundamentals), then add quick action buttons. Keep thinking mode as a separate analysis path, not the strategy-creation path. Wire up backtest preview in wizard step 3 using the already-complete `BacktestService.runBacktest()`.

---

## Standard Stack

### Core (already installed — no new packages needed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `openai` | ^6.31.0 | DeepSeek API via OpenAI-compatible SDK | Installed |
| `next` | 15.5.12 | App Router + Route Handlers for SSE | Installed |
| `backtest-kit` | ^5.9.0 | Backtest preview after strategy creation | Installed |
| `trading-signals` | ^7.4.3 | Indicator values for context enrichment | Installed |

### No new packages required
All capabilities needed for Phase 8 are available in the existing stack. The streaming pattern uses native `ReadableStream` (Node.js built-in). DeepSeek is accessed via the existing `openai` SDK with `baseURL` override.

**Key insight:** Do NOT install `ai` (Vercel AI SDK). It adds ~100KB+ and the project accesses DeepSeek directly. The native `ReadableStream` + `openai` SDK streaming is sufficient and simpler.

---

## Architecture Patterns

### Recommended Project Structure additions
```
src/
├── app/
│   └── api/
│       └── ai/
│           └── chat/
│               └── route.ts          # New — SSE streaming endpoint
├── server/
│   ├── providers/
│   │   └── ai/
│   │       ├── deepseek-provider.ts  # Extended with streaming + reasoner
│   │       └── types.ts              # Extended with streaming types
│   └── services/
│       └── ai-context-service.ts     # New — assembles enriched context
└── components/
    └── strategy/
        └── ai-chat.tsx               # Extended with streaming + quick actions
```

### Pattern 1: SSE Streaming via Route Handler

**What:** API Route Handler at `/api/ai/chat` returns a `ReadableStream` with SSE format. The OpenAI SDK's `.stream()` method produces an async iterable; we pipe it to a `ReadableStream` and return as `Response`.

**When to use:** All streaming AI responses. Server Actions cannot stream character-by-character — they wait for the full return value.

```typescript
// src/app/api/ai/chat/route.ts
import OpenAI from "openai"
import { getEnv } from "@/core/config/env"
import { getCurrentUserIdFromRequest } from "@/server/actions/helpers"

export const POST = async (req: Request): Promise<Response> => {
  const userId = await getCurrentUserIdFromRequest(req)
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const { messages, context } = await req.json()

  const env = getEnv()
  const client = new OpenAI({ apiKey: env.DEEPSEEK_API_KEY, baseURL: env.DEEPSEEK_BASE_URL })

  const stream = await client.chat.completions.create({
    model: "deepseek-reasoner",  // or "deepseek-chat" for tool calls
    messages,
    stream: true,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        // reasoning_content = thinking tokens (show as "thinking..." UI)
        if (delta?.reasoning_content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: delta.reasoning_content })}\n\n`))
        }
        if (delta?.content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    }
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  })
}
```

### Pattern 2: Client-side streaming reader in AiChat

**What:** Replace `chatStrategyAction` call with `fetch` + `ReadableStream` reader to consume SSE chunks.

```typescript
// In AiChat component — streaming fetch
const streamResponse = async (messages: AiChatMessage[]) => {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context: enrichedContext }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6)
      if (data === "[DONE]") return
      const parsed = JSON.parse(data)
      // Update streaming message in state
      if (parsed.type === "content") {
        setStreamingContent(prev => prev + parsed.content)
      }
    }
  }
}
```

### Pattern 3: Two-phase DeepSeek model switching

**What:** CRITICAL — `deepseek-reasoner` does NOT support function calling. Use it for analysis/discussion; switch to `deepseek-chat` only when calling `create_strategy` tool.

```typescript
// In DeepSeekProvider — extend with model selection
async chatWithThinking(messages: AiChatMessage[], forceCreate: boolean): Promise<AiChatResponse> {
  const needsToolCall = forceCreate || this.userWantsToCreateStrategy(messages)

  if (needsToolCall) {
    // Use deepseek-chat WITH tool_calls — existing implementation
    return this.chatAboutStrategy(messages)
  }

  // Use deepseek-reasoner for analysis — NO tool_calls
  const response = await this.client.chat.completions.create({
    model: "deepseek-reasoner",
    messages: this.toApiMessages(messages),
    stream: false,  // or stream: true via route handler
  })

  const thinking = response.choices[0]?.message?.reasoning_content ?? ""
  const content = response.choices[0]?.message?.content ?? ""

  return { message: content, thinkingContent: thinking }
}
```

### Pattern 4: Context enrichment service

**What:** `AiContextService` assembles market data, portfolio, and fundamentals into a structured context string injected into the system prompt.

```typescript
// src/server/services/ai-context-service.ts
export class AiContextService {
  async assembleContext(params: {
    ticker: string
    timeframe: string
    userId: string
  }): Promise<string> {
    const [candles, orderBook, portfolio, fundamentals, seniorCandles] = await Promise.allSettled([
      this.broker.getCandles(params.userId, { instrumentId: params.ticker, interval: params.timeframe, ... }),
      this.getOrderBook(params.ticker),
      this.broker.getPortfolio(params.userId),
      this.fundamentalService.getMetrics(params.ticker, currentPrice),
      this.getSeniorTimeframeCandles(params.ticker, params.timeframe),
    ])
    // Format into structured string for AI context injection
    return this.formatContext({ candles, orderBook, portfolio, fundamentals, seniorCandles })
  }
}
```

### Pattern 5: Quick action buttons in chat messages

**What:** Extend `ChatMessage` type with `actions?: QuickAction[]`. After AI proposes a strategy, it returns structured action hints; the component renders them as buttons.

```typescript
type QuickAction = {
  label: string   // "Создать стратегию" | "Другие варианты" | "Изменить риски"
  action: "CREATE" | "MORE" | "ADJUST_RISKS"
  payload?: Record<string, unknown>
}

type ChatMessage = AiChatMessage & {
  strategy?: AiGeneratedStrategy
  actions?: QuickAction[]
  hidden?: boolean
  isStreaming?: boolean
}
```

The AI response parser detects when the AI has proposed a strategy (via `strategy` field from tool call) and injects standard quick actions into the message. Buttons call `handleSend` with predefined text ("Создай эту стратегию", "Покажи другой вариант", "Сделай риск-менеджмент консервативнее").

### Pattern 6: Backtest preview in wizard step 3

**What:** After strategy is created (wizard step "form"), automatically run `BacktestService.runBacktest()` and show results. `BacktestService` is already fully implemented from Phase 9.

```typescript
// In AiWizardDialog — after strategy saved
const handleStrategyCreated = async (strategyId: string) => {
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - 3)  // 3 months default

  const result = await runBacktestAction(strategyId, {
    fromDate,
    toDate,
    positionSize: 100_000,
  })
  if (result.success) {
    setBacktestResult(result.data)
  }
}
```

### Pattern 7: Multi-timeframe senior candles

**What:** Senior timeframe = one level up from current. Map: 1m→5m, 5m→15m, 15m→1h, 1h→4h, 4h→1d, 1d→1w. Fetch both in parallel; include senior candles last 50 bars as context.

```typescript
const SENIOR_TIMEFRAME: Record<string, string> = {
  "1m": "5m", "5m": "15m", "15m": "1h",
  "1h": "4h", "4h": "1d", "1d": "1w", "1w": "1w",
}
```

### Pattern 8: Conversation continuity after strategy creation

**What:** When user creates strategy in step 3, add a system-side message to chat history: "Стратегия '{name}' создана. Можете продолжить — попросить другую стратегию или изменить параметры." Keep `messages[]` in state. Wizard step "strategy" becomes always-accessible, not reset on creation.

**Key change:** Remove `chatKey` increment on `handleStrategyGenerated`. Instead, add a marker message and keep the existing conversation alive.

### Anti-Patterns to Avoid

- **Using deepseek-reasoner for tool calls:** Documented NOT SUPPORTED — returns error. Always use `deepseek-chat` when `create_strategy` tool call is needed.
- **Passing `reasoning_content` back in message history:** DeepSeek API returns 400 if `reasoning_content` is included in input messages. Strip it before sending history back to API.
- **Streaming via Server Actions:** Server Actions return Promise<T> — they block until fully resolved. Cannot stream. Must use Route Handler.
- **Single OpenAI client instance across SSE:** Each SSE request must create its own stream — do not cache/share.
- **temperature on deepseek-reasoner:** Not supported. Do not set it when using reasoner model.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming protocol | Custom WebSocket | Native `ReadableStream` + SSE in Route Handler | Node.js built-in, OpenAI SDK yields async iterable |
| AI SDK wrapper | Custom streaming parser | `openai` SDK `.stream()` + async `for await` | SDK handles chunking, reconnection, error detection |
| Backtest execution | New backtest engine | `BacktestService.runBacktest()` from Phase 9 | Fully implemented, MOEX schema registered |
| Fundamental lookup | MOEX ISS scraping | `FundamentalService.getMetrics()` | Already implemented with static + live dividend data |
| Portfolio context | Custom portfolio fetcher | `BrokerService.getPortfolio()` | Existing service, already has positions + operations |
| Order book | Custom gRPC call | `getOrderBookAction(figi, depth)` | Already implemented in terminal-actions.ts |
| Correlation data | New calculation | `PortfolioAnalyticsService.getCorrelationMatrix()` | Already implemented, use cached result |

---

## Common Pitfalls

### Pitfall 1: deepseek-reasoner tool_calls failure
**What goes wrong:** `create_strategy` tool call sent to `deepseek-reasoner` — API returns error (tool calls not supported on reasoner).
**Why it happens:** Reasoner model doesn't support function calling by design (produces CoT instead).
**How to avoid:** Route analysis/discussion through `deepseek-reasoner`, route strategy creation through `deepseek-chat`. Decision point: does the current turn need a tool call? If yes → `deepseek-chat`.
**Warning signs:** Error response from API when model is `deepseek-reasoner` and tools array is non-empty.

### Pitfall 2: reasoning_content in message history
**What goes wrong:** DeepSeek returns 400 error on next turn.
**Why it happens:** The API forbids `reasoning_content` in input messages. If you store the full API response in chat history and send it back, the 400 triggers.
**How to avoid:** When building `apiMessages` from chat history, always strip `reasoning_content` — only pass `role` and `content`.
**Warning signs:** 400 errors on second+ turns in a conversation that used `deepseek-reasoner`.

### Pitfall 3: Server Action blocks streaming
**What goes wrong:** Characters don't appear as they stream — full response appears after a delay.
**Why it happens:** Server Actions resolve as Promises — Next.js waits for the return value before sending to client.
**How to avoid:** Use Route Handler (`/api/ai/chat/route.ts`) for streaming. Keep Server Actions for non-streaming calls (create strategy, run backtest).

### Pitfall 4: Context too large (50k char limit)
**What goes wrong:** AI analysis action returns "Сообщение слишком длинное" error.
**Why it happens:** Candles array for 500+ bars + order book + portfolio + fundamentals can easily exceed 50k chars.
**How to avoid:** Send only last 100 candles in context (not 500+ warmup candles). Order book: max depth 5. Portfolio: positions summary only (ticker, weight %, P&L), not full operation history.
**Warning signs:** Context string length > 45k chars before sending.

### Pitfall 5: Backtest timing — not yet saved strategy
**What goes wrong:** Backtest runs with wrong/empty config because strategy isn't persisted yet.
**Why it happens:** Strategy form submit and backtest trigger are async — backtest might run before DB write completes.
**How to avoid:** Run backtest AFTER `createStrategyAction` returns `{ id }`. Pass the returned `strategyId` to `runBacktestAction`. Don't run on optimistic data.

### Pitfall 6: Chat state reset on strategy creation (conversation continuity broken)
**What goes wrong:** User creates strategy, then says "now do GAZP" but chat history is gone.
**Why it happens:** `chatKey` is incremented in `handleStrategyGenerated`, which unmounts and remounts `AiChat` (clearing `messages` state).
**How to avoid:** Stop incrementing `chatKey` after strategy creation. Instead, append a marker message to existing conversation. Only reset on explicit "new chat" action.

### Pitfall 7: Auth in Route Handler vs Server Action
**What goes wrong:** Streaming endpoint accessible without auth.
**Why it happens:** Route Handlers don't automatically get auth context like Server Actions — need explicit session check.
**How to avoid:** Call `getServerSession()` or `supabase.auth.getUser()` at the start of the Route Handler POST function. Return 401 if no user.

---

## Code Examples

### DeepSeek streaming with reasoning_content

```typescript
// Source: api-docs.deepseek.com/guides/reasoning_model
const stream = await client.chat.completions.create({
  model: "deepseek-reasoner",
  messages: [{ role: "user", content: "Analyze SBER chart" }],
  stream: true,
})

let reasoningContent = ""
let content = ""
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta
  if (delta?.reasoning_content) {
    reasoningContent += delta.reasoning_content
  }
  if (delta?.content) {
    content += delta.content
  }
}
```

### Context assembly (senior timeframe)

```typescript
const SENIOR_TIMEFRAME: Record<string, string> = {
  "1m": "5m", "5m": "15m", "15m": "1h",
  "1h": "4h", "4h": "1d", "1d": "1w", "1w": "1w",
}

// Fetch both timeframes in parallel
const [mainCandles, seniorCandles] = await Promise.allSettled([
  broker.getCandles(userId, { instrumentId, interval: timeframe, from, to }),
  broker.getCandles(userId, { instrumentId, interval: SENIOR_TIMEFRAME[timeframe] ?? "1d", from, to }),
])
```

### Quick action buttons rendering (inside ChatMessage)

```typescript
// After AI proposes strategy, inject standard actions
{msg.actions && msg.actions.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {msg.actions.map((action) => (
      <button
        key={action.action}
        type="button"
        className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
        onClick={() => handleQuickAction(action)}
      >
        {action.label}
      </button>
    ))}
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `deepseek-chat` — non-reasoning | `deepseek-reasoner` for analysis — chain-of-thought | Deeper, more contextualized analysis |
| OHLCV candles only in context | + volume, order book, portfolio, fundamentals, senior TF | AI makes instrument-aware recommendations |
| Blocking Server Action | Streaming Route Handler + SSE | Character-by-character streaming UX |
| Fixed quick reply buttons (ticker presets) | Contextual quick action buttons after AI proposal | Guided workflow post-analysis |
| Strategy creation resets chat | Conversation continues across creations | Multi-turn refinement flow |

**Deprecated/outdated:**
- `chatStrategyAction` for streaming: Replace with Route Handler. Keep for non-streaming fallback if needed.
- `QUICK_REPLIES` constant (ticker shortcuts): Replace with dynamic `QuickAction[]` per message after strategy proposal.

---

## Critical Architecture Decision: Model Routing

The AIUP-01 (thinking mode) and AIUP-04 (quick actions via tool_calls) requirements create a fundamental conflict: **`deepseek-reasoner` does not support function calling**.

**Resolution — two-mode provider:**

```
User message →
  ├── forceCreate? (user said "yes create") → deepseek-chat + tool_calls
  └── analysis/discussion → deepseek-reasoner (streaming) → reasoning_content (shown as "thinking" bubble) + content
```

The `AiProvider` interface needs a new method:
```typescript
interface AiProvider {
  generateStrategy(prompt: string): Promise<AiGeneratedStrategy>
  chatAboutStrategy(messages: AiChatMessage[]): Promise<AiChatResponse>
  chatWithThinking(messages: AiChatMessage[], forceCreate?: boolean): AsyncIterable<AiStreamChunk>  // NEW
}
```

Where `AiStreamChunk = { type: "thinking" | "content" | "strategy" | "done", content: string }`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| DeepSeek API key | All AI features | Assumed (env DEEPSEEK_API_KEY) | — | Mock provider |
| `openai` npm package | DeepSeek client | Yes | ^6.31.0 | — |
| `backtest-kit` | AIUP-08 preview | Yes | ^5.9.0 | Skip preview, show "coming soon" |
| Redis | Context caching (optional) | Yes | ioredis ^5.10.0 | In-memory, no cache |
| Tinkoff API | Order book + candles | Yes | tinkoff-invest-api ^7.0.1 | Empty order book in context |

---

## Validation Architecture

Test framework: Vitest `^4.1.0`. Config: `vitest.config.ts` (assumed from Phase 9). Quick run: `npx vitest run`. Full: `npx vitest run --reporter=verbose`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| AIUP-01 | Reasoner model used for analysis path | unit | `vitest run src/__tests__/ai-context-service.test.ts` | Mock OpenAI client |
| AIUP-02 | Context enrichment includes volume, OB, portfolio | unit | `vitest run src/__tests__/ai-context-service.test.ts` | Assert context string contains expected fields |
| AIUP-03 | Senior timeframe candles fetched and included | unit | Same file | Assert SENIOR_TIMEFRAME map + dual fetch |
| AIUP-04 | Quick actions injected when strategy proposed | unit | `vitest run src/__tests__/ai-chat.test.tsx` | Test message type parsing |
| AIUP-05 | Streaming SSE works | manual | Dev server curl test | SSE hard to unit test; integration test |
| AIUP-06 | Portfolio positions in AI context | unit | `vitest run src/__tests__/ai-context-service.test.ts` | Assert portfolio summary present |
| AIUP-07 | Fundamentals in context when ticker has data | unit | Same file | Use FUNDAMENTALS_MAP mock |
| AIUP-08 | Backtest runs after strategy save | unit | `vitest run src/__tests__/backtest-actions.test.ts` | Mock BacktestService |
| AIUP-09 | Messages preserved after strategy creation | unit | `vitest run src/__tests__/ai-chat.test.tsx` | Check chatKey not incremented |

### Wave 0 Gaps
- [ ] `src/__tests__/ai-context-service.test.ts` — covers AIUP-01, 02, 03, 06, 07
- [ ] `src/__tests__/ai-chat.test.tsx` — extends existing ai-analysis-button.test.ts pattern for AIUP-04, 09

*(Existing `src/__tests__/ai-analysis-button.test.ts` and `src/__tests__/backtest-service.test.ts` are usable as reference.)*

---

## Open Questions

1. **Thinking content visibility**
   - What we know: `reasoning_content` is available in streaming chunks
   - What's unclear: Does Anton want to see the thinking process, or only the final answer?
   - Recommendation: Show thinking as a collapsible "Reasoning..." indicator during streaming; collapse when content starts arriving

2. **Backtest default params**
   - What we know: `BacktestService.runBacktest()` needs `fromDate`, `toDate`, `positionSize`
   - What's unclear: Should backtest period be 1 month, 3 months, or 1 year? What positionSize?
   - Recommendation: Default 3 months, 100k position. Make configurable in UI later.

3. **Order book figi lookup**
   - What we know: `getOrderBookAction(figi, depth)` requires FIGI, not ticker
   - What's unclear: How to get FIGI from ticker in the chat context (chat only knows ticker string)
   - Recommendation: Use existing broker instrument lookup — `BrokerService` can resolve ticker→figi via `getInstruments()`. Cache the map.

4. **Rate limiting / cost of deepseek-reasoner**
   - What we know: Reasoner model has higher latency (~10-30s thinking) and cost vs chat
   - What's unclear: DeepSeek pricing for reasoner vs chat
   - Recommendation: Only use reasoner for initial analysis; use chat model for follow-up turns once strategy direction established

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `src/server/providers/ai/deepseek-provider.ts`, `src/components/strategy/ai-chat.tsx`, `src/server/services/backtest-service.ts`, `src/server/actions/backtest-actions.ts`, `src/server/services/fundamental-service.ts`
- [DeepSeek API Docs — Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) — model names, streaming format, `reasoning_content` field
- [DeepSeek API Docs — Reasoning Model](https://api-docs.deepseek.com/guides/reasoning_model) — confirmed: function calling NOT supported on `deepseek-reasoner`

### Secondary (MEDIUM confidence)
- [Next.js 15 Streaming Guide](https://www.rickyspears.com/technology/streaming-in-next-js-15-websockets-vs-server-sent-events-a-comprehensive-guide/) — SSE via Route Handler pattern
- [Upstash Blog — SSE with LLM in Next.js](https://upstash.com/blog/sse-streaming-llm-responses) — ReadableStream + fetch reader pattern

### Tertiary (LOW confidence)
- Various WebSearch results on openai SDK + SSE without Vercel AI SDK — consistent pattern, multiple sources agree

---

## Metadata

**Confidence breakdown:**
- Current implementation audit: HIGH — read from actual source files
- DeepSeek thinking mode API: HIGH — read official docs directly
- Tool calls on reasoner (NOT SUPPORTED): HIGH — official docs explicit
- Streaming pattern (Route Handler + ReadableStream): MEDIUM — not tested in this project yet, but standard Next.js pattern
- Backtest integration: HIGH — `BacktestService.runBacktest()` is fully implemented from Phase 9

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable stack; DeepSeek API may change faster — 7 days for that section)
