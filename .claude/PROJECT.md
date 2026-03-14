# AlgoBuilder — Project Documentation

## Overview
AI-powered algorithmic trading platform. Users create trading strategies via AI prompts or manual constructor, set up signal monitors, connect T-Invest broker, receive Telegram notifications.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui + 21st.dev |
| ORM | Prisma |
| Auth | Supabase self-hosted (@supabase/ssr) |
| Database | PostgreSQL (via Supabase) |
| Cache | Redis (ioredis) |
| AI | Claude API / DeepSeek (function calling) |
| Broker | tinkoff-invest-api (gRPC) |
| Notifications | grammy (Telegram Bot) |
| State | zustand (strategy form) |
| Forms | react-hook-form + zod |
| Toasts | sonner |
| Icons | lucide-react |

## File Structure
```
src/
├── app/
│   ├── (auth)/login/, register/
│   ├── (dashboard)/
│   │   ├── page.tsx              # Dashboard
│   │   ├── strategies/page.tsx   # Strategy list
│   │   ├── strategies/[id]/      # Strategy edit
│   │   ├── signals/page.tsx      # Signal list
│   │   ├── broker/page.tsx       # T-Invest connection
│   │   └── settings/page.tsx     # Settings + Telegram
│   └── api/ai/, broker/, signals/, webhooks/
├── core/
│   ├── config/env.ts, indicators.ts, instruments.ts
│   ├── errors/app-error.ts
│   ├── types/api.ts, strategy.ts, signal.ts
│   └── schemas/auth.ts, strategy.ts, signal.ts
├── server/
│   ├── repositories/base, user, strategy, signal
│   ├── services/strategy, signal, signal-checker, notification
│   ├── providers/ai/, broker/, notification/
│   └── actions/strategy, signal, broker
├── components/
│   ├── ui/                       # shadcn
│   ├── shared/instrument-picker, condition-builder
│   ├── strategy/form, ai-generator, card
│   ├── signal/form, card
│   ├── forms/login, register
│   └── layouts/dashboard-layout
├── hooks/use-strategy-store, use-broker
├── lib/prisma.ts, redis.ts, supabase/, utils.ts
└── styles/globals.css
```

## Database Models
- **User** — supabaseId, email, name, telegramChatId, brokerToken, brokerAccountId
- **Strategy** — userId, name, status (DRAFT/ACTIVE/PAUSED/ARCHIVED), instrument, config (JSON: entry/exit/risks)
- **Signal** — userId, name, instrument, signalType (BUY/SELL), conditions (JSON), channels, isActive
- **SignalLog** — signalId, instrument, message, triggeredAt

## Session Roadmap
| # | Focus | Status |
|---|-------|--------|
| 0 | Init: project skeleton, Prisma, structure | In Progress |
| 1 | Auth: register, login, route protection | Pending |
| 2 | Dashboard: layout, widgets, navigation | Pending |
| 3 | Strategy constructor + AI generator | Pending |
| 4 | Signal constructor | Pending |
| 5 | T-Invest broker integration | Pending |
| 6 | Telegram notifications + signal checker | Pending |
| 7 | Polish + deploy | Pending |

## ENV Variables
See `.env.example` for full list. Key groups: Supabase, Database, Redis, AI Provider, T-Invest, Telegram Bot, App URL.
