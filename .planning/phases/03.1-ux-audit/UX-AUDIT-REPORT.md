# UX Audit Report — AculaTrade

**Date:** 2026-03-25
**Method:** Playwright headful browser walkthrough on aculatrade.com (production)
**Viewports:** Desktop 1440x900, Mobile 390x844
**Screenshots:** 20 files in `screenshots/`

---

## Summary

Overall the product looks professional and cohesive in dark theme. Main issues: empty states lack guidance, some pages feel sparse, mobile strategy cards need work, and several flows have friction points.

**Critical:** 4 | **High:** 9 | **Medium:** 14 | **Low:** 5

---

## Critical Issues (fix now)

### C1. Terminal empty state — huge blank area, no onboarding
**Page:** /terminal (desktop + mobile)
**Problem:** When no instrument is selected, the entire page is a gray empty box with tiny text "Выберите инструмент для просмотра графика". No popular tickers, no suggestions, no recent history. User sees an empty page and doesn't know what to do.
**Fix:** Add popular tickers grid (SBER, GAZP, LKOH, YNDX etc) below the selector as quick-pick buttons. Show "Популярные инструменты" section.

### C2. Portfolio page shows all zeros when no broker data — confusing
**Page:** /portfolio (desktop + mobile)
**Problem:** When "Брокерский портфель" is selected but no positions exist, user sees 5 cards all showing "0,00 ₽" and "+0,00 ₽ / +0.00%". There's also a red banner "Нет акций или ETF в портфеле" under Risk Metrics. This looks broken, not empty.
**Fix:** Replace the zero-cards with a single onboarding card: "Подключите брокера и совершите первые сделки" with a link to /broker. Hide risk metrics section entirely when no positions.

### C3. "Тестовая торговля" tab in portfolio — where is the new portfolio summary block?
**Page:** /portfolio
**Problem:** The new Phase 3 portfolio summary block (POL-01) with debit/credit/% growth is not visible on the Брокерский портфель tab. It may only appear when there are real positions, but users on Стартовый тариф won't see it until they trade. No indication that this feature exists.
**Fix:** Show the summary block on "Тестовая торговля" tab too (since strategies generate paper trades there).

---

## High Issues

### H1. Strategy cards — mobile layout is too dense
**Page:** /strategies (mobile)
**Problem:** On 390px viewport, strategy cards show all info (ticker, timeframe, price, entry/exit conditions, SL/TP, operations, P&L) stacked vertically. Each card takes 200+ px height. With 3 strategies the page is very long scroll. The stats cards (Всего стратегий, Активных, etc.) also stack as full-width cards taking significant space.
**Fix:** Collapse stats into a 2x2 grid on mobile. Make strategy card conditions collapsible by default on mobile. Show only name + status + P&L, expand for details.

### H2. Strategy dialog — AI chat initial message is generic
**Page:** /strategies > Новая стратегия dialog
**Problem:** AI says "Привет! Давайте создадим торговую стратегию. Какой инструмент вас интересует?" with quick-pick buttons (MOEX Class, GAZP, LKOH, Облигации). This is good, but the quick-pick buttons feel random. "MOEX Class" is not an instrument name users would recognize. "Облигации" is a category, not a ticker.
**Fix:** Replace with top-5 most popular tickers by name: "Сбер", "Газпром", "Лукойл", "Яндекс", "Т-Банк". Add a "Другой" button that prompts text input.

### H3. Signals page — empty state is good but form is complex
**Page:** /signals (desktop)
**Problem:** Empty state with "Создайте первый сигнал" CTA is well done. But when creating a signal, the form immediately shows "Условие 1" with Индикатор/Условие dropdowns and "Цена UI: 0" input. New users don't understand what "Цена UI" means or how to configure indicators. No help text, no examples.
**Fix:** Add placeholder text or help tooltips explaining each field. Show an example signal configuration ("Пример: Цена Сбера выше 300 ₽").

### H4. Broker page — "Скоро" label on Финам is unclear
**Page:** /broker (desktop + mobile)
**Problem:** Финам shows as available with a "Скоро" tag but no explanation. Users might try to connect and get frustrated.
**Fix:** Add subtitle: "Интеграция в разработке. Оставьте email для уведомления."

### H5. Terminal "Создать стратегию" / "Создать сигнал" buttons not visible without instrument
**Page:** /terminal
**Problem:** The new Phase 3 buttons (POL-09) only appear when an instrument is selected. Without an instrument, the terminal page is barren. User doesn't know these features exist.
**Fix:** This is by design (needs instrument context), but add hint text near the instrument selector: "Выберите инструмент для создания стратегий и анализа"

---

## Medium Issues

### M1. Dashboard — "Ежедневные Обзоры Рынков" card says "Прочитать отчёт за 19 марта"
**Page:** /dashboard
**Problem:** The market review date is static (19 марта) — feels outdated if today is 25 марта. Looks like the feature is broken or abandoned.
**Fix:** Either auto-update the date or remove the specific date reference. Show "Последний отчёт" instead.

### M2. Dashboard — "Как начать работать за 3 шага?" card
**Page:** /dashboard
**Problem:** The onboarding card is good but always visible even for experienced users who have strategies and trades. It takes prime real estate.
**Fix:** Hide after user has completed all 3 steps (connected broker + created first strategy). Or add a dismiss button.

### M3. Strategies page — summary cards inconsistency
**Page:** /strategies (desktop)
**Problem:** Top stats show: "Всего стратегий: 3", "Активных: 3", "Размер портфеля: 0₽", "Суммарный P&L: -44,51₽", "-0.07%". The "Размер портфеля: 0₽" is confusing — all strategies are "Ожидает вход" so portfolio is 0, but this isn't obvious.
**Fix:** When portfolio is 0 and all strategies await entry, show "Нет открытых позиций" instead of "0 ₽".

### M4. Strategies page — yellow warning banner is too wide
**Page:** /strategies (desktop)
**Problem:** "Внимание: API доступ к вашему Т-Инвесту ограничен..." banner spans full width above stats. It's important but overly prominent for a recurring notice.
**Fix:** Make it dismissable, or reduce to a compact inline notice.

### M5. Settings page — Telegram section shows raw data
**Page:** /settings (desktop)
**Problem:** Shows "Подключен: ИМЯ Ник @TheLynchStar_bot" and "Chat ID: 304972320" and "Тест / Отключить" buttons. The Chat ID is technical info users don't need. The bot name showing is confusing.
**Fix:** Hide Chat ID. Show just "Telegram подключен ✓" with test/disconnect buttons.

### M6. Header — "0 ₽ +0 Объём торгов" always visible
**Page:** All pages (header)
**Problem:** The balance/volume widget shows "0 ₽ +0 Объём торгов" in the header. For users with no trades, this is noise. Takes header space.
**Fix:** Hide when value is 0. Or show only on strategies/portfolio pages.

### M7. Portfolio — "Пополнения" card design differs from others
**Page:** /portfolio (mobile)
**Problem:** The "Пополнения" card spans full width while P&L cards are in a 2-column grid. Inconsistent layout.
**Fix:** Make all cards same width or use consistent grid.

### M8. Strategy card — "Условие входа:" / "Условие выхода:" text truncation
**Page:** /strategies (desktop)
**Problem:** Long condition descriptions like "Bollinger Bands(10,2) Ниже на % 0" wrap to multiple lines. With tooltips added in Phase 3, this is better, but the raw technical text is still hard to read for non-technical users.
**Fix:** Future: human-readable condition summaries ("Когда цена ниже нижней полосы Боллинджера").

---

## Low Issues

### L1. Mobile header — "Приведи друга" button takes significant space
**Page:** All pages (mobile header)
**Problem:** Green "Приведи друга" gift icon button is always in mobile header. Combined with (?), Тариф badge, and user avatar — header is crowded.
**Fix:** Move referral to settings or dashboard only.

### L2. Sidebar — "Выход" at very bottom
**Page:** All pages (desktop sidebar)
**Problem:** "Выход" button is at absolute bottom of sidebar, far from other nav items. On some screens it's barely visible.
**Fix:** Not critical — standard pattern. Just noting.

### L3. Signal form — "Авто" button for threshold is unclear
**Page:** /signals > Create dialog
**Problem:** There's an "Авто" dropdown next to the threshold input. Users don't know what "Авто" means in this context.
**Fix:** Tooltip: "Автоматически выбрать пороговое значение на основе текущих данных"

### L4. Dashboard cards — bottom row icons are too small
**Page:** /dashboard (desktop)
**Problem:** "Стратегии", "Сигналы", "API Интеграция", "Настройки" cards at the bottom have tiny icons and descriptions. They're navigation shortcuts but look like footer content.
**Fix:** Slightly larger icons or remove if sidebar navigation is sufficient.

---

## Flow-Specific Findings

### Flow: Create Strategy (AI Chat) — flowA screenshots
- AI chat opens as default — Phase 3 working correctly
- Quick-pick buttons: "MOEX Сбер", "MOEX Газпром", "LKOH Показ", "Облигации", "Свечи", "Дивидендные" — mix of tickers and categories
- "или заполнить вручную" link below chat — clicking expands full manual form underneath
- **F1. CRITICAL — Manual form is cut off by dialog height.** After clicking "заполнить вручную", the form tabs (Описание, Вход, Выходы, Риски) appear but dialog doesn't resize. Form fields visible: Название, Тип инструмента (Акции), Выберите инструмент, Таймфрейм (1 day), Описание. But scrolling shows the SAME content — conditions (Вход/Выходы) are NOT visible even when scrolling. The dialog appears to not scroll or the form content is incomplete.
- **F2. HIGH — AI chat + manual form coexist awkwardly.** When manual form is expanded, the AI chat stays at the top taking 40% of dialog space. The form is squeezed below. User sees two interfaces at once — confusing. Should be either/or with a clear toggle, not both stacked.
- **F3. MEDIUM — No form validation feedback visible.** No asterisks on required fields, no inline validation hints. User doesn't know which fields are mandatory until they try to submit.
- **F4. MEDIUM — "Описание" textarea has no placeholder.** Just says "Описание" as label with an empty box. No hint like "Опишите свою стратегию (необязательно)".

### Flow: Create Signal — flowB screenshots
- Form structure: Основное (Название, Тип инструмента, Инструмент, Тип сигнала, Таймфрейм, Описание) → Условия срабатывания (Условие 1: Индикатор + Условие + Значение)
- **F5. HIGH — "Тип сигнала: Алерт (без типа)" is confusing.** What does "без типа" mean? Dropdown shows "Алерт (без типа)" as default — users don't know what other types exist or why this is default. No tooltip.
- **F6. HIGH — Condition builder is opaque for new users.** "Условие 1: Индикатор [Цена], Условие [Больше чем], Цена UI [0], Тайфрейм условия [Авто]". Problems:
  - "Цена UI" — what does "UI" mean? This is the threshold value field but label makes no sense
  - Default value "0" — a signal for "price > 0" would trigger immediately for any stock
  - "Авто" button for threshold — no explanation of what auto-calculates
  - No example or template to guide first-time users
- **F7. MEDIUM — Dialog doesn't scroll.** The form appears to be fully visible in one view but condition actions (SL/TP, notification settings) are not visible — either they don't exist in the signal form or they're hidden below the fold. The form bottom just stops at "Условие 1".
- **F8. LOW — No "Добавить условие" button visible.** User might want multiple conditions but the add button (if exists) is not in the visible area.

### Flow: Terminal Instrument Selection — flowC screenshots
- Dropdown shows list: VIMO, UNAC, OBUV, VKCO, MGNT, KZIZ, VTBM — these are random tickers, not sorted by popularity
- **F9. HIGH — Instrument list is not sorted by relevance.** Default list shows obscure tickers (VIMO, UNAC, OBUV) instead of popular ones (SBER, GAZP, LKOH). Users have to search to find common stocks.
- Typing "SBER" shows 2 results: "SBER: Сбер Банк" and "SBERP: Сбер Банк — привилегированные в..." — search works correctly
- **F10. MEDIUM — SBERP description is truncated.** Full name doesn't fit, cuts off with "..."
- After search, Playwright couldn't select (role="option" not matching) — likely custom component issue. The search itself works.

### Flow: Strategy Cards — flowD screenshots
- Cards show: name, status badges (Активна, Ожидает вход/Позиция открыта), ticker info, conditions, SL/TP, P&L
- **F11. MEDIUM — All strategy stats cards show 0.** "Всего стратегий: 0", "Активных: 0", etc. BUT cards below show 3 strategies with "Активна" badges. The stats count doesn't match the actual cards. Likely a timing/cache issue on production.
- **F12. MEDIUM — "Позиция открыта" badge on MACD strategy but showing "Ожидает вход" on others.** Status is clear per card, but there's no legend explaining what each status means.
- Operations section was not expandable via Playwright (no "Операции" text found in DOM) — may need click on the P&L/operations row specifically

### Flow: Portfolio Expand
- Could not test — this account has no portfolio positions. The click redirected to tariff page.

---

## Recommendations Priority

**Fix now (Phase 3.1 scope) — Critical + High:**
1. **F1** — Strategy dialog: manual form doesn't scroll, conditions not reachable
2. **F2** — Strategy dialog: AI chat + manual form stacked awkwardly, should be toggle
3. **F6** — Signal condition builder: "Цена UI" label, default 0, no guidance
4. **F5** — Signal type "Алерт (без типа)" unclear
5. **F9** — Terminal instrument list: random order, not by popularity
6. **C1** — Terminal empty state: no popular tickers
7. **C2** — Portfolio all-zeros empty state
8. **C3** — Summary block missing on Тестовая торговля tab
9. **H1** — Mobile strategy cards density
10. **H2** — AI chat quick-pick buttons (MOEX Class, Облигации)
11. **H3** — Signal form no help text
12. **M3** — "Размер портфеля: 0₽" misleading
13. **M6** — "0₽ Объём торгов" header noise

**Backlog:**
- F3, F4, F7, F8, F10, F11, F12 (form polish, truncation, stats mismatch)
- H4, H5 (Финам badge, terminal hint text)
- M1, M2, M4, M5, M7, M8 (dashboard staleness, onboarding, settings cleanup)
- L1-L4 (mobile header, sidebar, tooltip text)
