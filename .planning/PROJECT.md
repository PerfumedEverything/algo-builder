# AculaTrade — Portfolio Analytics & Terminal

## What This Is

Расширение платформы AculaTrade профессиональной аналитикой портфеля и встроенным терминалом. Раздел "Портфель" превращается в аналитический инструмент с риск-метриками, фундаментальным анализом, корреляциями и оптимизацией Марковица. Новая страница /terminal — свечной график с данными T-Invest. Skeleton loading по всему сайту для UX.

## Core Value

Пользователь видит профессиональную аналитику своего портфеля (риски, фундаментал, корреляции, оптимизация) и может анализировать графики инструментов — всё в едином стиле платформы.

## Requirements

### Validated

- ✓ Auth (Supabase, Telegram OTP для forgot-password) — existing
- ✓ Strategy constructor + AI generation — existing
- ✓ Signal constructor + checker pipeline — existing
- ✓ Broker integration (T-Invest) — existing
- ✓ Portfolio with positions, P&L, FIFO lots — existing
- ✓ AI Chat (DeepSeek) — existing
- ✓ Telegram notifications — existing
- ✓ Admin panel — existing
- ✓ Docker deploy (VPS, HTTPS, aculatrade.com) — existing

### Active

- [ ] MOEX ISS провайдер (IMOEX бенчмарк, P/E, P/B, дивиденды)
- [ ] Свечной график инструмента (lightweight-charts, T-Invest данные)
- [ ] Страница /terminal с графиком и поиском тикера
- [ ] Плашка пополнений (deposit tracker)
- [ ] Risk metrics (Sharpe, Beta, VaR, Max Drawdown, Alpha)
- [ ] Фундаментальный анализ (P/E, P/B, дивиденды, скоринг)
- [ ] Корреляционная матрица (@nivo/heatmap)
- [ ] Когортный анализ (по секторам, типам, результатам)
- [ ] Оптимизация портфеля (Марковиц)
- [ ] AI анализ на каждом блоке аналитики
- [ ] Skeleton loading по всем страницам dashboard
- [ ] Баг-фикс: тикеры с @ и неверным регистром в стратегиях

### Out of Scope

- SMTP email — Telegram OTP достаточно для сброса пароля
- ROE/ROA, PEG, Debt/Equity — нет бесплатного API для бух. отчётности РФ
- Глубокий терминал (стакан, лента, AlgoPack) — будущие milestone
- Real-time чат — не core value
- OAuth (Google/GitHub) — email + password достаточно

## Context

- **Existing codebase:** 33 сессии разработки, полноценная платформа
- **Codebase map:** .planning/codebase/ (7 документов)
- **Plan document:** .claude/docs/PLAN-PORTFOLIO-ANALYTICS.md (детальный план v2)
- **Anton feedback:** графики — TOP приоритет визуально, risk metrics — TOP-1 по ценности
- **Anton:** /terminal отдельной вкладкой в sidebar, не внутри портфеля
- **Баг тикеров:** при выборе инструмента тикер показывается с @ на конце, иногда с неверным регистром, курс кривой

## Constraints

- **Stack**: Next.js 15, TypeScript, Tailwind, shadcn/ui, Supabase (auth only), Redis
- **Data**: T-Invest API (свечи, позиции, операции), MOEX ISS API (бенчмарк, фундаментал) — оба бесплатные
- **Packages**: lightweight-charts, simple-statistics, @nivo/heatmap
- **Style**: единая тёмная тема, CSS vars, никаких iframe/чужих виджетов
- **Deploy**: VPS 5.42.121.212, Docker, aculatrade.com

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| lightweight-charts вместо TradingView виджета | Полный контроль стиля, наложение маркеров, нет iframe | — Pending |
| simple-statistics вместо portfolio-analytics npm | portfolio-analytics заброшен (47 скач/нед), формулы простые ~200 строк | — Pending |
| Свой MOEX провайдер вместо moex-api npm | moex-api заброшен (104 скач), ISS API простой REST ~100 строк | — Pending |
| /terminal отдельная страница | Anton feedback — графики как визуальный приоритет | — Pending |
| Skeleton loading | UX polish по всем страницам dashboard | — Pending |

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
*Last updated: 2026-03-23 after initialization*
