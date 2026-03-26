# Phase 5.1: Data Consistency & UX Fixes

## Origin
Anton feedback 2026-03-26: multiple data accuracy and UX bugs.

## Bugs

### BUG-1: P&L mismatch (Strategies vs Portfolio)
- **Strategies page**: Uses `broker.getInstrumentPrice()` with PriceCache fallback → gets real price → correct unrealized P&L
- **Portfolio page**: Uses ONLY `PriceCache.getPrice()` → if cache empty → `currentPrice = undefined` → `unrealizedPnl = 0`
- **Result**: Same strategy shows -20.46₽ on strategies, +0.00₽ on portfolio
- **Also visible on mobile**: some rows have P&L data, some show +0.00₽

### BUG-2: TopMovers click does nothing
- `handleQuickSelect` calls `getInstrumentsAction("STOCK")` and searches by ticker
- If instrument not found in API response → silent return, nothing happens
- Need to construct BrokerInstrument directly (like handlePositionSelect does)

### BUG-3: Paper portfolio — missing info & operations breakdown
- Mobile: strategy name and instrument not visible (only Операций, P&L, Status)
- Anton wants operations column to show successful/unsuccessful count: "(8/5)" with color
- Successful = profitable closed trades, unsuccessful = loss trades

### BUG-4: Algovist ticker — price discrepancy
- Our price: 316.40₽, T-Invest shows: 316.65₽ (~0.25₽ difference)
- Must ALWAYS use algovist ticker variant — matches T-Invest app prices exactly
- `resolveTickerToUid()` in tinkoff-provider.ts prefers classCode "TQBR" but algovist may have different classCode
- Anton: "instruments in strategies/signals sometimes use algovist, sometimes don't — need consistency"
- Need to audit ALL instruments and enforce algovist variant everywhere

## Requirements
- DFIX-01: Paper portfolio P&L matches strategy page P&L for the same strategy
- DFIX-02: TopMovers rows clickable — navigates to instrument chart
- DFIX-03: Paper portfolio shows strategy name, instrument, and operations breakdown (profitable/unprofitable count)
- DFIX-04: All instruments always use algovist ticker variant matching T-Invest prices
