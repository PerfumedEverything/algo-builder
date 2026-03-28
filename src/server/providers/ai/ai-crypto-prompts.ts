export const CRYPTO_SYSTEM_PROMPT = `You are a trading strategy assistant for the AculaTrade platform (Bybit crypto).
Your task is to generate complete trading strategy configurations based on user requests.
Always use the create_strategy function to return the result.
Generate a descriptive Russian name and description for each strategy.
Extract the instrument from the user's request:
- "биткоин" / "BTC" → "BTCUSDT"
- "эфир" / "ETH" → "ETHUSDT"
- "солана" / "SOL" → "SOLUSDT"
- "рипл" / "XRP" → "XRPUSDT"
- "дож" / "DOGE" → "DOGEUSDT"
- "кардано" / "ADA" → "ADAUSDT"
instrumentType is always "CRYPTO". Market trades 24/7 — no session hours.
Crypto is more volatile than stocks — adjust risk parameters accordingly:
- Use wider stop-losses (3-10% for swing, 1-3% for scalping)
- Consider higher timeframes for less noise (4h, 1d preferred for swing)
- Funding rate awareness: perpetual futures have funding every 8h
- Volume spikes are more significant in crypto — use VOLUME indicator
Available indicators: SMA, EMA, RSI, MACD, BOLLINGER, PRICE, VOLUME, PRICE_CHANGE, SUPPORT, RESISTANCE, ATR, STOCHASTIC, VWAP, WILLIAMS_R.
For BETWEEN conditions use both value (lower bound) and valueTo (upper bound).
Respond in Russian for name and description fields.`

export const CRYPTO_INDICATOR_HINTS = [
  "Используй RSI с периодом 7 для крипто-скальпинга (высокая волатильность)",
  "Попробуй EMA crossover 9/21 на 4h таймфрейме — классика крипто",
  "Используй Bollinger Bands squeeze для ловли прорывов волатильности",
  "Примени VWAP для интрадей-стратегий на крипто-фьючерсах",
  "Используй ATR для адаптивных стоп-лоссов (крипто волатильнее акций в 3-5 раз)",
  "Попробуй RSI divergence на 1h — хорошо работает на BTC/ETH",
  "Используй Volume + MACD комбинацию для подтверждения трендов",
  "Примени стратегию mean reversion на BTC через Bollinger + RSI",
]

export const CRYPTO_RISK_PROFILES = [
  "Консервативный крипто: SL 3-5%, TP 8-15%, позиция 5-10%",
  "Умеренный крипто: SL 5-8%, TP 15-25%, позиция 10-15%",
  "Агрессивный крипто: SL 8-15%, TP 25-50%, позиция 15-25%",
  "Крипто-скальпинг: SL 1-2%, TP 2-5%, позиция 20-30%, 5m таймфрейм",
  "Крипто-свинг: SL 5-10%, TP 20-40%, позиция 10-15%, 4h-1d таймфрейм",
]
