# Indicator Audit Report

**Date:** 2026-03-27T07:46:21.812Z
**Library:** trading-signals
**Candles:** 600 deterministic OHLCV (SBER-like, price ≈ 280 RUB)

## Results

| Indicator | Value | Status |
|-----------|-------|--------|
| RSI(14) | 59.1408 | OK |
| SMA(20) | 293.3089 | OK |
| EMA(20) | 294.2685 | OK |
| MACD(12,26,9) | {"macd":3.0730876506714253,"signal":2.4995908055476175,"histogram":0.5734968451238078} | OK |
| Bollinger(20,2) | {"upper":302.9856581337461,"middle":293.3088518832243,"lower":283.6320456327025} | OK |
| ATR(14) | 5.5764 | OK |
| Stochastic(14,3) | 67.0253 | OK |
| VWAP | 312.0456 | OK |
| WilliamsR(14) | -35.9395 | OK |

## Cross-Checks

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| SMA(20) manual mean | 293.3089 | 293.3089 | YES |
| Bollinger middle === SMA(20) | Within 0.1% | 0.0000% | YES |
| MACD histogram === macd - signal | Within 0.001 | 0.000000 | YES |
