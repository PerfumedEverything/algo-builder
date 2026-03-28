---
phase: 14-bybit-provider-backend
verified: 2026-03-28T13:15:00Z
status: gaps_found
score: 12/14 requirements verified
gaps:
  - truth: "AI prompts are conditionally selected based on brokerType in actual AI calls"
    status: failed
    reason: "getSystemPrompt/getIndicatorHints/getRiskProfiles selectors were created in ai-prompts.ts but deepseek-provider.ts still imports and uses static SYSTEM_PROMPT, INDICATOR_HINTS, RISK_PROFILES directly — the conditional selection is never invoked"
    artifacts:
      - path: "src/server/providers/ai/deepseek-provider.ts"
        issue: "Imports SYSTEM_PROMPT, INDICATOR_HINTS, RISK_PROFILES directly; does not call getSystemPrompt(brokerType)"
      - path: "src/server/providers/ai/ai-prompts.ts"
        issue: "getSystemPrompt/getIndicatorHints/getRiskProfiles selectors exist but are orphaned — no caller uses them"
    missing:
      - "deepseek-provider.ts must accept brokerType parameter and call getSystemPrompt(brokerType) instead of hardcoded SYSTEM_PROMPT"
      - "AI actions (wherever DeepSeekProvider.generateStrategy is called) must pass brokerType from user settings"
  - truth: "When brokerType is BYBIT, 8 decimal precision is applied to price display"
    status: partial
    reason: "8-decimal precision is described in broker-switch.tsx subtitle text ('Крипто: BTCUSDT, ETHUSDT… • 24/7 • Testnet') as informational copy, but no actual number formatting code in the codebase enforces 8-decimal display when brokerType=BYBIT"
    artifacts:
      - path: "src/components/settings/broker-switch.tsx"
        issue: "Subtitle text mentions 8 signs precision conceptually but no toFixed(8) or decimal formatting logic exists"
    missing:
      - "Either implement conditional decimal precision in price display components OR clarify this is deferred — the requirement as written (BYBIT-12) specifies '8 знаков точности' as an active feature"
human_verification:
  - test: "Connect Bybit testnet credentials in settings, switch broker to Bybit, verify terminal shows crypto pairs and prices update via WebSocket"
    expected: "Broker switch shows Bybit as active, terminal lists BTCUSDT/ETHUSDT pairs, prices update live"
    why_human: "Requires live Bybit testnet credentials and running Redis/worker — cannot test programmatically"
  - test: "Create AI strategy for crypto (e.g. 'купи биткоин по RSI') and verify CRYPTO_SYSTEM_PROMPT is used (note: currently BLOCKED by gap in BYBIT-13)"
    expected: "After BYBIT-13 gap is fixed — AI uses crypto-specific prompt with BTCUSDT ticker mappings"
    why_human: "Requires live AI provider call and UI interaction"
---

# Phase 14: Bybit Provider — Backend + Multi-broker Verification Report

**Phase Goal:** Bybit as second broker (spot + perpetual futures) via bybit-api SDK. Multi-broker UI with T-Invest/Bybit switch. Refactor T-Invest to use API-provided data instead of custom calculations.
**Verified:** 2026-03-28T13:15:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | BybitBrokerProvider implements BrokerProvider interface — all methods work | VERIFIED | bybit-provider.ts: 10 methods, class implements BrokerProvider, 11 tests all green |
| 2 | Realtime prices and orderbook via WebSocket with auto-reconnect | VERIFIED | bybit-stream-worker.ts: subscribeV5 for tickers + orderbook, reconnect/reconnected event handlers, WebsocketClient handles reconnect internally |
| 3 | T-Invest / Bybit switch in user settings | VERIFIED | BrokerSwitch component wired in settings/page.tsx via getBrokerSettingsAction + switchBrokerAction |
| 4 | When Bybit: crypto pairs, 24/7, 8 decimal, USDT | PARTIAL | Crypto pairs, 24/7, USDT verified. 8-decimal precision is only informational text in UI, no actual number formatting code |
| 5 | AI prompts adapted for crypto | FAILED | CRYPTO_SYSTEM_PROMPT exists but deepseek-provider.ts uses static SYSTEM_PROMPT directly, never calling getSystemPrompt(brokerType) |
| 6 | Bybit testnet supported | VERIFIED | testnet: true in RestClientV5 (bybit-provider.ts:45) and WebsocketClient (bybit-stream-worker.ts:25) |
| 7 | Tests: mock API, each provider method verified | VERIFIED | bybit-provider.test.ts: 11 tests covering all 10 methods, all pass |

**Score:** 5/7 truths fully verified, 1 partial, 1 failed

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/providers/broker/bybit-provider.ts` | Full BybitBrokerProvider class | VERIFIED | 150 lines, all 10 BrokerProvider methods, RestClientV5, testnet: true |
| `src/server/providers/broker/bybit-constants.ts` | BYBIT_CRYPTO_PAIRS + BYBIT_INTERVAL_MAP | VERIFIED | 8 crypto pairs, 13 interval mappings |
| `src/server/providers/broker/bybit-provider.test.ts` | 11 unit tests with mocked API | VERIFIED | 11 tests, all green (confirmed by vitest run) |
| `src/server/providers/broker/types.ts` | BrokerProvider with placeOrder + cancelOrder | VERIFIED | Both methods present in interface |
| `src/server/providers/broker/index.ts` | Async getBrokerProvider(userId) factory | VERIFIED | Routes to BybitProvider for BYBIT users |
| `src/server/repositories/broker-repository.ts` | bybitApiKey, bybitApiSecret, getBrokerType | VERIFIED | All methods present and wired to Supabase |
| `src/server/services/broker-service.ts` | All methods use await getBrokerProvider(userId) | VERIFIED | All 8 methods create provider per call |
| `src/core/types/broker.ts` | BYBIT in BrokerAccount.type, CRYPTO in instrumentType | VERIFIED | Both union types extended |
| `src/server/services/crossing-detector.ts` | Uses @ixjb94/indicators crossOverNumber | VERIFIED | evaluateCrossingBatch with ta.crossOverNumber/crossUnderNumber |
| `src/server/services/indicator-series.ts` | Series methods returning number[] | VERIFIED | RSI, SMA, EMA, MACD, Stochastic, WilliamsR series methods |
| `scripts/bybit-stream-worker.ts` | Bybit WebSocket worker | VERIFIED | 105 lines, subscribeV5 for tickers/orderbook/klines, Redis writes, SIGTERM handler |
| `docker-compose.yml` | bybit-worker service | VERIFIED | Service defined with Dockerfile.bybit-worker, BYBIT_API_KEY/SECRET env vars |
| `Dockerfile.bybit-worker` | Dedicated worker Dockerfile | VERIFIED | File exists, mirrors Dockerfile.worker pattern |
| `src/server/providers/ai/ai-crypto-prompts.ts` | Crypto-specific AI prompts | VERIFIED | CRYPTO_SYSTEM_PROMPT, CRYPTO_INDICATOR_HINTS, CRYPTO_RISK_PROFILES |
| `src/server/providers/ai/ai-prompts.ts` | getSystemPrompt conditional selector | VERIFIED (ORPHANED) | Selector functions exist but no caller uses them |
| `src/components/settings/broker-switch.tsx` | T-Invest / Bybit toggle | VERIFIED | BrokerSwitch renders two broker cards, handles switchBrokerAction |
| `src/server/actions/settings-actions.ts` | switchBrokerAction + connectBybitAction | VERIFIED | Both actions present with getCurrentUserId(), BrokerRepository calls |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `broker/index.ts` | `broker-repository.ts` | getBrokerType(userId) | WIRED | getBrokerType called in getBrokerProvider factory |
| `broker-service.ts` | `broker/index.ts` | await getBrokerProvider(userId) | WIRED | All 8 BrokerService methods use this pattern |
| `bybit-provider.ts` | `bybit-api RestClientV5` | SDK client methods | WIRED | RestClientV5 constructed in connect(), all 6 API methods called |
| `broker/index.ts` | `bybit-provider.ts` | new BybitProvider() | WIRED | If brokerType === 'BYBIT' returns new BybitProvider() |
| `broker-switch.tsx` | `settings-actions.ts` | switchBrokerAction | WIRED | Component imports and calls switchBrokerAction |
| `settings/page.tsx` | `broker-switch.tsx` | BrokerSwitch component | WIRED | Component rendered with brokerType + hasApiKey props |
| `bybit-stream-worker.ts` | Redis | price:{ticker} keys + price-updates pub/sub | WIRED | redis.set and redis.publish calls with same key format as T-Invest worker |
| `bybit-stream-worker.ts` | bybit-api WebsocketClient | subscribeV5 for tickers and orderbook | WIRED | subscribeV5 called for tickers.{symbol}, orderbook.1.{symbol} |
| `ai-prompts.ts` | `ai-crypto-prompts.ts` | getSystemPrompt conditional selection | ORPHANED | Functions exist but deepseek-provider.ts never calls getSystemPrompt(brokerType) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `bybit-provider.ts:getPortfolio` | unrealisedPnl | RestClientV5.getPositionInfo → PositionV5.unrealisedPnl | Yes | FLOWING |
| `bybit-provider.ts:getCandles` | candles | RestClientV5.getKline → reversed list | Yes | FLOWING |
| `broker-switch.tsx` | broker, credsSaved | getBrokerSettingsAction() → DB read | Yes | FLOWING |
| `deepseek-provider.ts:generateStrategy` | SYSTEM_PROMPT | Static import from ai-prompts.ts (hardcoded) | Static only | HOLLOW — getSystemPrompt selector never called |
| `tinkoff-provider.ts:getPortfolio` | averagePrice | API averagePositionPriceFifo (with manual fallback) | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| BybitProvider unit tests | npx vitest run bybit-provider.test.ts | 11/11 pass | PASS |
| bybit-api in package.json | grep "bybit-api" package.json | 4.6.1 found | PASS |
| @ixjb94/indicators in package.json | grep "@ixjb94" package.json | 1.2.4 found | PASS |
| getBrokerProvider factory routes to BybitProvider | grep "'BYBIT'" broker/index.ts | Found at line 16 | PASS |
| switchBrokerAction validates broker type | grep "TINKOFF.*BYBIT\|brokerType !== " settings-actions.ts | Validation present | PASS |
| CRYPTO_SYSTEM_PROMPT consumed by AI provider | grep "getSystemPrompt" deepseek-provider.ts | Not found — orphaned | FAIL |
| bybit-worker in docker-compose | grep "bybit-worker" docker-compose.yml | Found at line 50 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| BYBIT-01 | 14-04 | bybit-api installed, BybitBrokerProvider implements BrokerProvider | SATISFIED | bybit-provider.ts implements all 10 methods; bybit-api@4.6.1 in package.json |
| BYBIT-02 | 14-02, 14-04 | getPortfolio() returns USDT balance + positions with unrealized P&L | SATISFIED | TinkoffProvider uses averagePositionPriceFifo + expectedYieldFifo; BybitProvider uses unrealisedPnl from API |
| BYBIT-03 | 14-04 | getCandles() returns OHLCV candles passing validateOHLC | SATISFIED | getCandles reverses + parseFloat; BrokerService applies filterValidCandles |
| BYBIT-04 | 14-04 | placeOrder() submits limit and market orders | SATISFIED | submitOrder called in placeOrder(); test confirms orderId returned |
| BYBIT-05 | 14-04 | cancelOrder() cancels order | SATISFIED | cancelOrder called; test confirms correct params |
| BYBIT-06 | 14-03, 14-04 | Tests: mock Bybit API, each provider method verified | SATISFIED | 11 unit tests all green; @ixjb94/indicators crossover tests updated |
| BYBIT-07 | 14-05 | WebSocket subscription for tickers — realtime prices in price bar | SATISFIED | subscribeV5('tickers.{symbol}') + redis.publish to price-updates |
| BYBIT-08 | 14-05 | WebSocket subscription for orderbook — realtime order book | SATISFIED | subscribeV5('orderbook.1.{symbol}') + redis.set to orderbook:{symbol} |
| BYBIT-09 | 14-05 | Auto-reconnect on WebSocket disconnection | SATISFIED | bybit-api WebsocketClient handles reconnect internally; reconnect/reconnected events logged |
| BYBIT-10 | 14-05 | Integration with price-stream-worker via Redis pub/sub | SATISFIED | Same key format price:{ticker}, candles:{ticker}:{interval}, price-updates channel |
| BYBIT-11 | 14-06 | T-Invest / Bybit switch in user settings | SATISFIED | BrokerSwitch in settings/page.tsx wired to switchBrokerAction + getBrokerSettingsAction |
| BYBIT-12 | 14-06 | When Bybit: crypto pairs, 24/7 mode, 8 decimal precision, USDT currency | PARTIAL | Crypto pairs (BYBIT_CRYPTO_PAIRS), 24/7 (no market hours in provider), USDT verified. 8-decimal precision is informational text only — no number formatting code applies 8 decimals in UI |
| BYBIT-13 | 14-06 | AI prompts adapted for crypto | BLOCKED | CRYPTO_SYSTEM_PROMPT + getSystemPrompt() exist but deepseek-provider.ts uses static SYSTEM_PROMPT — conditional selection never invoked |
| BYBIT-14 | 14-04, 14-05 | Bybit testnet supported for safe testing | SATISFIED | testnet: true in RestClientV5 (bybit-provider.ts:45) and WebsocketClient (bybit-stream-worker.ts:25) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/server/providers/ai/deepseek-provider.ts` | 5, 17, 21 | Static import of SYSTEM_PROMPT ignores brokerType — getSystemPrompt selector is orphaned | Blocker | When user switches to Bybit, AI still uses RU-market prompt with Sber/Gazprom tickers instead of BTCUSDT/ETHUSDT crypto guidance |
| `src/server/providers/ai/ai-prompts.ts` | 45-52 | getSystemPrompt/getIndicatorHints/getRiskProfiles exported but never imported anywhere else | Warning | Dead code — conditional prompt selection requires caller integration in deepseek-provider.ts |

### Human Verification Required

#### 1. Live Bybit Testnet Integration

**Test:** Configure Bybit testnet API Key + API Secret in settings, switch broker to Bybit, open terminal, verify prices update live.
**Expected:** BrokerSwitch shows Bybit as active, terminal lists BTCUSDT/ETHUSDT, prices in price bar update via WebSocket.
**Why human:** Requires live Bybit testnet credentials, running Redis, and bybit-worker Docker container.

#### 2. T-Invest getPortfolio with real account

**Test:** Connect T-Invest account, fetch portfolio, verify averagePositionPriceFifo values match T-Invest app.
**Expected:** Position average prices match T-Invest's own calculations, no FIFO drift.
**Why human:** Requires live T-Invest account with real positions.

### Gaps Summary

Two gaps prevent full goal achievement:

**Gap 1 — BYBIT-13 (BLOCKER):** The AI prompt conditional selection is wired in `ai-prompts.ts` but completely disconnected from the AI provider. `deepseek-provider.ts` still hardcodes `SYSTEM_PROMPT` on line 21 and `INDICATOR_HINTS`/`RISK_PROFILES` on line 17. When a Bybit user creates a strategy via AI, the system uses Russian stock market prompts (Sber, Gazprom tickers) instead of crypto prompts (BTCUSDT, 24/7, funding rate guidance). Fix: `generateStrategy()` must accept `brokerType: string` parameter and use `getSystemPrompt(brokerType)` + `getIndicatorHints(brokerType)` + `getRiskProfiles(brokerType)`. The AI action that calls `generateStrategy()` must fetch and pass the user's `brokerType`.

**Gap 2 — BYBIT-12 (WARNING):** The requirement specifies "8 знаков точности" (8 decimal precision) as a concrete feature of Bybit mode. The broker-switch subtitle text mentions it informally but no `toFixed(8)` or conditional decimal formatter is applied to price displays when brokerType is BYBIT. This may be acceptable as a deferred display enhancement — clarify with stakeholder whether decimal precision in price display is required for phase completion or deferred to UI polish.

---

_Verified: 2026-03-28T13:15:00Z_
_Verifier: Claude (gsd-verifier)_
