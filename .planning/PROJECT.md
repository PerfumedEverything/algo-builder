# AculaTrade — AI Revolution + Deep Analytics

## What This Is

Платформа AculaTrade для алготрейдинга на MOEX. Автоматизация стратегий, сигналы, профессиональный терминал с графиками, портфельная аналитика с AI. Думающий AI-помощник, который размышляет вместе с пользователем и автоматически создаёт стратегии из диалога.

## Core Value

AI-помощник, который думает вместе с трейдером — свободный диалог, автоматическое создание стратегий, глубокая аналитика портфеля лучше чем у Т-Инвест.

## Current Milestone: v1.1 AI Revolution + Deep Analytics

**Goal:** Сделать продукт глубоким и умным — AI-бот в формате свободного размышления, глубокая аналитика терминала и портфеля.

**Target features:**
- AI Revolution — свободный диалог вместо квиза, автозаполнение параметров стратегии из разговора, связка анализ→стратегия/сигнал
- Terminal Depth — топ по росту/падению за день
- Portfolio Depth — корреляции, секторная аллокация, когорты, оптимизация Марковица

## Requirements

### Validated

- ✓ Auth (Supabase, Telegram OTP) — v1.0
- ✓ Strategy constructor + AI generation — v1.0
- ✓ Signal constructor + checker pipeline — v1.0
- ✓ Broker integration (T-Invest/Alor) — v1.0
- ✓ Portfolio with positions, P&L, FIFO lots — v1.0
- ✓ AI Chat (DeepSeek) — v1.0
- ✓ Telegram notifications — v1.0
- ✓ Admin panel — v1.0
- ✓ Docker deploy (VPS, aculatrade.com) — v1.0
- ✓ MOEX ISS provider (benchmark, fundamentals) — v1.0
- ✓ Terminal (lightweight-charts, order book, positions, trade history) — v1.0
- ✓ Risk metrics (Sharpe, Beta, VaR, Max Drawdown, Alpha) — v1.0
- ✓ Fundamental analysis (P/E, P/B, dividends, scoring) — v1.0
- ✓ Strategy pipeline fix (crossing, null-safety, atomic guards) — v1.0
- ✓ Strategy & portfolio hardening (cleanTicker, price freshness) — v1.0
- ✓ MVP Polish (strategy cards, AI chat mode, portfolio summary) — v1.0
- ✓ Deposit tracker — v1.0
- ✓ Skeleton loading — v1.0

### Active

- [ ] AI свободный диалог вместо квиза для создания стратегий
- [ ] Связка AI анализ в терминале → создание стратегии/сигнала
- [ ] Расширенные параметры стратегий
- [ ] Терминал: топ по росту/падению за день
- [ ] Корреляционная матрица позиций
- [ ] Секторная аллокация портфеля
- [ ] Когортный анализ (по секторам, типам, результатам)
- [ ] Оптимизация портфеля (Марковиц)
- [ ] Полный AI-анализ портфеля (все метрики + рекомендации)

### Out of Scope

- SMTP email — Telegram OTP достаточно
- ROE/ROA, PEG, Debt/Equity — нет бесплатного API для РФ бух. отчётности
- Real-time чат — не core value
- OAuth (Google/GitHub) — email + password достаточно
- Выставление заявок в терминале — Антон: пока не нужно
- Активные заявки в терминале — Антон: пока не нужно
- Скриптовые стратегии (Pine Script) — будущий milestone
- Новостной конструктор с AI — будущий milestone

## Context

- **Existing codebase:** 38+ сессий, полноценная платформа в проде (aculatrade.com)
- **v1.0 completed:** Infrastructure, Terminal v2, Risk Metrics, Strategy Pipeline Fix, Hardening, MVP Polish + Fundamentals
- **Anton feedback s38:** квиз ограничивает, нужен формат произвольного размышления, портфель глубже Т-Инвест
- **AI provider:** DeepSeek V3, OpenAI SDK compatible, temperature 0.7-0.8
- **TopMover type:** уже объявлен в core/types/terminal.ts, компонент не реализован

## Constraints

- **Stack**: Next.js 15, TypeScript, Tailwind, shadcn/ui, Supabase (auth only), Redis
- **Data**: T-Invest API (свечи, позиции, операции), MOEX ISS API (бенчмарк, фундаментал)
- **Packages**: lightweight-charts, simple-statistics, @nivo/heatmap
- **Style**: единая тёмная тема, CSS vars, никаких iframe/чужих виджетов
- **Deploy**: VPS 5.42.121.212, Docker, aculatrade.com
- **AI**: DeepSeek V3 primary, fallback, max input 50k chars

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| lightweight-charts вместо TradingView виджета | Полный контроль стиля, наложение маркеров, нет iframe | ✓ Good |
| simple-statistics вместо portfolio-analytics npm | portfolio-analytics заброшен, формулы простые | ✓ Good |
| Свой MOEX провайдер | moex-api заброшен, ISS API простой REST | ✓ Good |
| DeepSeek V3 для AI | Дешёвый, быстрый, OpenAI SDK compatible | ✓ Good |
| Свободный диалог вместо квиза | Антон: квиз ограничивает, нужно размышление | — Pending |
| @nivo/heatmap для корреляций | Готовый компонент, хорошая визуализация | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after milestone v1.1 start*
