# Phase 5: Terminal Top Movers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 05-terminal-top-movers
**Areas discussed:** Panel placement & layout, Row information density, Market hours behavior

---

## Panel Placement & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Два столбца сверху | Gainers + Losers над графиком, как Bloomberg Terminal | |
| Боковая панель справа | Вместе с order book в правой колонке | |
| Под графиком, рядом с позициями | Третья панель в нижней секции | |
| Под графиком, ВМЕСТО позиций | Top Movers на место позиций/истории, те опускаются ниже | ✓ |

**User's choice:** Top Movers под графиком на место позиций/истории, позиции и история торгов опускаются ниже (третья строка)
**Notes:** User suggested this layout — positions and trade history "don't work yet and aren't particularly needed", so Top Movers take their prominent position

---

## Row Information Density

| Option | Description | Selected |
|--------|-------------|----------|
| Компактно | Тикер + название + цена + % изменения (цветной) | ✓ |
| Расширенно | Тикер + название + цена + % + объём + High/Low дня | |

**User's choice:** Компактно — профессиональный вид как Bloomberg
**Notes:** None

---

## Market Hours Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Бейдж + метка | Бейдж "Биржа закрыта" + данные помечены как "посл. сессия" | |
| На усмотрение Claude | Реализовать как лучше подойдёт | ✓ |

**User's choice:** Claude's Discretion
**Notes:** None

---

## Claude's Discretion

- Market hours handling (badge, stale data label)
- Mobile responsive behavior
- Animation on data refresh

## Deferred Ideas

- AI commentary on top movers ("why SBER is rising") — future phase
- Sector filter for top movers — future enhancement
- Historical top movers (week/month) — future enhancement
