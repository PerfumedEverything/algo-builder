# Phase 15: Grid Trading - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 15-grid-trading
**Areas discussed:** Конкуренты/UX, Брокер, Ордера

---

## Конкуренты и UX подход

| Option | Description | Selected |
|--------|-------------|----------|
| Стандартный Grid | Базовый grid как у Veles | |
| Best-of-breed research | Deep research конкурентов, взять лучшее у каждого | ✓ |

**User's choice:** "аналог как у veles или у них не очень удобно сделано, надо ресерч сделать таких сервисов и взять лучшее у каждого, наш должен быть самым удобным и юзер френдли, но не менее функциональным"
**Notes:** Veles — основной референс но UX нужно улучшить. Обязательный deep research Veles, Pionex, 3Commas, Bitsgap.

---

## Брокер для Grid

| Option | Description | Selected |
|--------|-------------|----------|
| Только Bybit | Grid только крипто (Bybit уже имеет placeOrder) | |
| Bybit + MOEX | Оба брокера сразу | |
| Research first | Выяснить возможно ли grid на MOEX вообще | ✓ |

**User's choice:** "я вообще реально сделать такие для московской биржи, мы не потонем в багах? есть ли готовые решения, нужен ресерч тоже чтобы не потонуть в багах"
**Notes:** Пользователь обеспокоен сложностью MOEX. Нужен research готовых решений и возможности grid на MOEX.

---

## Ордера: реальные vs симуляция

| Option | Description | Selected |
|--------|-------------|----------|
| Сразу реальные | Реальные ордера через Bybit API. Testnet для тестов. | |
| Paper trading сначала | Симуляция на стриме цен, потом реальные ордера | ✓ |

**User's choice:** Paper trading сначала
**Notes:** Безопасный подход — сначала симуляция, реальные ордера после валидации.

---

## Claude's Discretion

- Архитектура GridTradingService
- DB schema для grid state
- Интеграция с strategy system

## Deferred Ideas

- Реальные ордера на Bybit (после paper trading валидации)
- Grid на MOEX (после research)
- Trailing grid (после базовой работает)
