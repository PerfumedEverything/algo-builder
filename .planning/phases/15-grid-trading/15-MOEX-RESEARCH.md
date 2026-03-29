# Grid Trading на MOEX — Deep Research

**Date:** 2026-03-29
**Verdict:** PARTIALLY_FEASIBLE

## Summary

T-Invest API полностью поддерживает лимитные ордера, отмену, стрим исполнений, sandbox. Но:
- Нет GTC (Good-Til-Cancelled) — ордера живут до конца дня
- Лотность: мин. ордер от 200 до 7500+ руб.
- Сессии: не 24/7, гэпы на открытии
- Комиссии: 0.05-0.30% за сделку

## Recommendation

MOEX Grid — отдельная фаза после валидации Bybit grid. Оценка: ~3-4 дня работы.
Текущий paper trading GridTradingService уже работает для MOEX симуляции.

## Full research available in memory (discuss-phase session 2026-03-29)
