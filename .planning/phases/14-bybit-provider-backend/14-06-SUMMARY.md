---
phase: 14-bybit-provider-backend
plan: "06"
subsystem: broker-switch-ui
tags: [bybit, settings, ai-prompts, broker-switch]
dependency_graph:
  requires: [14-01, 14-04]
  provides: [broker-ui-switch, crypto-ai-prompts]
  affects: [settings-page, ai-strategy-generation]
tech_stack:
  added: []
  patterns: [server-action, client-component, conditional-prompt-selection]
key_files:
  created:
    - src/server/providers/ai/ai-crypto-prompts.ts
    - src/components/settings/broker-switch.tsx
  modified:
    - src/server/providers/ai/ai-prompts.ts
    - src/server/actions/settings-actions.ts
    - src/app/(dashboard)/settings/page.tsx
decisions:
  - "getSystemPrompt/getIndicatorHints/getRiskProfiles selectors added to ai-prompts.ts — backward-compatible, consumers can migrate to conditional selection"
  - "connectBybitAction validates credentials via getAccounts() before persisting — fail-fast on bad keys"
  - "BrokerSwitch defers to credential form when BYBIT selected and no API key saved"
  - "getBrokerSettingsAction added to expose brokerType + hasApiKey to settings page without exposing raw credentials"
metrics:
  duration: 247
  completed_date: "2026-03-28"
  tasks: 2
  files: 5
---

# Phase 14 Plan 06: Broker Switch UI + Crypto AI Prompts Summary

Multi-broker UI toggle in settings and crypto-specific AI prompts with conditional selection by brokerType.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create crypto AI prompts and conditional selection | c59ea52 | ai-crypto-prompts.ts, ai-prompts.ts |
| 2 | Broker switch UI + settings action | ec2a306 | broker-switch.tsx, settings-actions.ts, settings/page.tsx |

## What Was Built

**Crypto AI Prompts (`ai-crypto-prompts.ts`):**
- `CRYPTO_SYSTEM_PROMPT` — Bybit-specific prompt with BTC/ETH/SOL/XRP/DOGE/ADA ticker mappings, 24/7 awareness, wider SL guidance, funding rate awareness
- `CRYPTO_INDICATOR_HINTS` — 8 crypto-tailored indicator hints (RSI 7, EMA 9/21, VWAP, ATR adaptive stops)
- `CRYPTO_RISK_PROFILES` — 5 crypto risk profiles (conservative 3-5% SL to scalping 1-2%)

**Conditional Prompt Selection (`ai-prompts.ts`):**
- `getSystemPrompt(brokerType)` — returns CRYPTO_SYSTEM_PROMPT for BYBIT, SYSTEM_PROMPT for TINKOFF
- `getIndicatorHints(brokerType)` — returns crypto or RU hints
- `getRiskProfiles(brokerType)` — returns crypto or RU profiles

**Settings Actions (`settings-actions.ts`):**
- `switchBrokerAction(brokerType)` — validates TINKOFF|BYBIT, saves via BrokerRepository
- `connectBybitAction(apiKey, apiSecret)` — connects BybitProvider to verify credentials, then persists
- `getBrokerSettingsAction()` — returns brokerType + hasApiKey (no raw secrets exposed to client)

**Broker Switch Component (`broker-switch.tsx`):**
- Two card buttons: T-Invest (Building2 icon) and Bybit (Bitcoin icon)
- Active broker highlighted with primary color and CheckCircle
- Bybit subtitle: "Крипто: BTCUSDT, ETHUSDT… • 24/7 • Testnet"
- T-Invest subtitle: "Акции, облигации, ETF • MOEX • Рубли"
- On Bybit click without saved credentials: shows inline API Key/Secret form
- Credential form calls connectBybitAction, shows toast on success/error

**Settings Page:** BrokerSwitch section added at top, loads brokerType via getBrokerSettingsAction in parallel with profile fetch.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. BrokerSwitch reads live brokerType from DB via getBrokerSettingsAction.

## Self-Check: PASSED

- src/server/providers/ai/ai-crypto-prompts.ts: FOUND
- src/components/settings/broker-switch.tsx: FOUND
- src/server/actions/settings-actions.ts (switchBrokerAction): FOUND
- Commits c59ea52, ec2a306: FOUND
