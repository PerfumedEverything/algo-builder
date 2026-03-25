# Phase 3: MVP Polish + Fundamentals — Context

## Phase Goal
Product feels polished and professional — strategy cards are clear, terminal links to strategies, AI chat replaces quiz, UI consistent + users see fundamental metrics per position.

## Why This Phase
Anton feedback (s35, s37): strategies are the core product, but UX is confusing. Cards show wrong numbers, there's no way to go from terminal analysis to strategy creation, and quiz format is too rigid. Polish first, then add fundamentals.

## Requirements

### Strategy Card & UX (POL-07, POL-08)
| Req | Description | Notes |
|-----|-------------|-------|
| POL-07 | Closed position → show P&L only | Bug: currentAmount = totalBuyAmount + pnl shows 19K when should show -28₽. When holdingQty=0, hide "portfolio size", show only realized P&L and % |
| POL-08 | Strategy card clarity | Clear labels: "Результат" not ambiguous sum. Tooltips on conditions. Human-readable condition text. Operation pairs (buy→sell) grouped visually |

### Terminal ↔ Strategies (POL-09)
| Req | Description | Notes |
|-----|-------------|-------|
| POL-09 | Terminal actions | "Создать стратегию" / "Создать сигнал" buttons in terminal. Pre-fill instrument, pass to strategy/signal creation page |

### AI Chat Mode (POL-10)
| Req | Description | Notes |
|-----|-------------|-------|
| POL-10 | Free-form AI chat | Replace quiz with chat dialog. User describes idea → AI generates StrategyConfig JSON → user reviews and saves. Flow: terminal AI analysis → "создай стратегию" → AI generates config → redirect to strategy page |

### UI Polish (POL-01 through POL-06)
| Req | Description | Notes |
|-----|-------------|-------|
| POL-01 | Portfolio summary block | Total value from tradeAmounts, debit/credit, % growth |
| POL-02 | AI buttons → blue background | All pages, visual consistency |
| POL-03 | Signal cleanTicker | @ suffix bug in signal creation actions |
| POL-04 | Terminal sidebar position | Move to #2 after Dashboard |
| POL-05 | Chart timeframes fix | 1D = daily candles over weeks, not 1 day of data |
| POL-06 | Terminal mobile | Timeframe selector, AI button fit, chart full width |

### Fundamentals (INFR-02b, FUND-01 through FUND-05)
| Req | Description | Notes |
|-----|-------------|-------|
| INFR-02b | P/E, P/B data source | MOEX ISS lacks this — need alternative (smart-lab scraping or manual mapping) |
| FUND-01 | FundamentalService | Fetches P/E, P/B, dividend yield per ticker |
| FUND-02 | Composite scoring | 1-10 scale, weighted average |
| FUND-03 | Color coding | green=cheap, yellow=normal, red=expensive |
| FUND-04 | UI card in position expand | Below chart in portfolio position row |
| FUND-05 | AI fundamental analysis | DeepSeek evaluates multiples + price |

## Key Decisions Needed
1. **P/E/P/B source**: MOEX ISS doesn't provide these. Options:
   - Smart-lab.ru scraping (has P/E, P/B for all MOEX stocks, free but fragile)
   - Manual JSON mapping for top ~50 tickers (stable but requires updates)
   - Combine: manual for top tickers + smart-lab fallback
2. **AI chat architecture**: Full chat with message history vs single-prompt generation with preview

## Key Bug Details (POL-07)
```
// Current (wrong for closed positions):
currentAmount = initialAmount + pnl  // = totalBuyAmount + pnl = 19652 + (-28) = 19624
// Shows 19,652₽ as "portfolio" when position is fully closed

// Fix: when holdingQty === 0, display only:
// - Realized P&L in ₽ (-28.52₽)
// - Realized P&L in % (-0.14%)
// - Hide "portfolio size" / "currentAmount"
```

## Dependencies
- Phase 1: MOEXProvider (dividend data already available)
- Phase 2.3: Hardened strategy pipeline (clean tickers in DB)

## Suggested Plan Split
1. **Plan 01 — Strategy Card Fix & UX**: POL-07, POL-08 (P&L display fix, clear labels, tooltips)
2. **Plan 02 — Terminal Links + UI Polish**: POL-04, POL-05, POL-06, POL-09 (sidebar, timeframes, mobile, create buttons)
3. **Plan 03 — AI Chat + Small Fixes**: POL-10, POL-01, POL-02, POL-03 (chat mode, portfolio summary, blue buttons, cleanTicker)
4. **Plan 04 — Fundamental Data Layer**: INFR-02b + FUND-01, FUND-02 (data source + service + scoring)
5. **Plan 05 — Fundamental UI + AI**: FUND-03, FUND-04, FUND-05 (cards, colors, AI analysis)
