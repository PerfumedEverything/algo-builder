# Phase 15: Grid Trading - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Grid Trading — автоматический buy→sell→buy цикл внутри ценового диапазона. Основной инструмент крипто-трейдинга. AI предлагает параметры сетки на основе волатильности.

Фаза начинается с paper trading (симуляция на стриме цен), переход к реальным ордерам — следующий шаг после валидации.

</domain>

<decisions>
## Implementation Decisions

### Deep Research конкурентов (CRITICAL — до планирования)
- **D-01:** Обязательный deep research Grid Trading платформ: Veles, 3Commas, Pionex, Bitsgap, KuCoin Grid, а также западные конкуренты (Cryptohopper, Quadency, TradeSanta и др.). Анализ UX/UI, параметров, механик. Взять лучшее у каждого.
- **D-02:** Наш Grid должен быть самым удобным и user-friendly, но не менее функциональным чем конкуренты.
- **D-03:** Research готовых библиотек/решений для Grid Trading — не писать с нуля если есть проверенные решения.

### Брокер и биржи
- **D-04:** Paper trading (симуляция) в первую очередь — НЕ реальные ордера. Симуляция на стриме цен из WebSocket.
- **D-05:** Bybit — основная целевая биржа для Grid (placeOrder/cancelOrder уже реализованы в Phase 14).
- **D-06:** MOEX — нужен отдельный research: возможно ли grid trading на Московской бирже, есть ли API для лимитных ордеров, какие ограничения. Решение по MOEX принимается после research.

### Тестирование (ZERO TOLERANCE)
- **D-07:** TDD строго — тесты ПЕРЕД реализацией. Права на ошибки нет.
- **D-08:** Симуляция 100+ ценовых тиков — проверить количество сделок и P&L до копейки.
- **D-09:** Edge cases: partial fills, price gaps, concurrent orders, boundary conditions, выход цены за пределы сетки.
- **D-10:** P&L math с точными числами (как FIFO в Phase 12).
- **D-11:** Verify против известного поведения Veles (Phase 16 — cross-validation).

### Grid механика
- **D-12:** Тип сетки, распределение уровней (arithmetic/geometric), trailing — определяется после research конкурентов.
- **D-13:** Новый тип стратегии `GRID` в StrategyConfig с параметрами (lowerPrice, upperPrice, gridLevels, amountPerOrder).

### Claude's Discretion
- Архитектура GridTradingService — класс, state machine, event-driven
- Способ хранения состояния сетки (DB schema)
- Интеграция с существующей системой стратегий vs отдельная сущность

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategy system
- `src/core/types/strategy.ts` — StrategyConfig type, needs GRID extension
- `src/server/providers/broker/types.ts` — BrokerProvider interface with placeOrder/cancelOrder

### Broker implementations
- `src/server/providers/broker/bybit-provider.ts` — Real placeOrder/cancelOrder implementation
- `src/server/providers/broker/tinkoff-provider.ts` — placeOrder is NotImplementedError stub

### Requirements
- `.planning/REQUIREMENTS-v2.0.md` — GRID-01 through GRID-10 requirements

### Price streaming
- `scripts/price-stream-worker.ts` — WebSocket price stream (source for paper trading simulation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BrokerProvider.placeOrder/cancelOrder` — interface ready, Bybit implementation exists
- `usePriceStream` hook — real-time price updates for grid monitoring UI
- `StrategyDialog`, `StrategyForm` — patterns for create/edit dialogs
- `BacktestService` — backtest infrastructure, can inform grid simulation design
- `InstrumentChart` (lightweight-charts) — can overlay grid levels as price lines

### Established Patterns
- Service Layer: `GridTradingService` should follow same pattern as `StrategyService`, `BacktestService`
- Server Actions: mutations through `*Action` functions with getCurrentUserId()
- Repository Pattern: Supabase JS SDK for data access
- Worker processes: `price-stream-worker.ts`, `bybit-worker.ts` — pattern for background grid execution

### Integration Points
- Strategy system — new strategy type `GRID` alongside existing indicator-based
- Terminal — grid levels overlay on chart
- Telegram notifications — grid cycle completions
- AI — DeepSeek suggests grid parameters from volatility analysis

</code_context>

<specifics>
## Specific Ideas

- Взять лучший UX из каждого конкурента (Veles, Pionex, 3Commas, Bitsgap)
- Veles — основной референс, но у них "не очень удобно сделано" → улучшить UX
- Pionex — считается лидером в grid trading UX → изучить
- Paper trading сначала, потом реальные ордера — безопасный подход к запуску

</specifics>

<deferred>
## Deferred Ideas

- Реальные ордера на Bybit — после валидации paper trading (возможно Phase 15.1)
- Grid Trading на MOEX — зависит от результатов research (возможно отдельная фаза)
- Trailing grid — продвинутая механика, после базовой работает

</deferred>

---

*Phase: 15-grid-trading*
*Context gathered: 2026-03-29*
