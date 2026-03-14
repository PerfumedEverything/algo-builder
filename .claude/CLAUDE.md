# AlgoBuilder — Project Rules

## Project
AI-powered algorithmic trading platform. Strategy constructor with AI generation, signal monitoring, broker integration (T-Invest), Telegram notifications.

## Stack
- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (strict)
- **Tailwind CSS 4** + **shadcn/ui** + **21st.dev**
- **Prisma ORM** + **Supabase self-hosted** (Auth only)
- **Redis** (ioredis) — cache, signal check queue
- **tinkoff-invest-api** — T-Invest gRPC SDK
- **Anthropic SDK / DeepSeek API** — AI function calling
- **grammy** — Telegram Bot
- **zustand** — strategy form state
- **react-hook-form + zod** — forms and validation
- **sonner** — toasts
- **lucide-react** — icons

## Architecture Rules

### Code
- OOP where applicable (services, providers — classes)
- DRY — shared logic in shared modules
- No comments in code
- Naming: camelCase vars, PascalCase components/classes, kebab-case files
- One export per file where possible
- Barrel exports (index.ts) for each module
- Max 150 lines per file
- Early return instead of nested if

### Patterns
- Repository Pattern — Prisma repositories
- Service Layer — business logic
- Provider Pattern — external APIs behind abstraction (broker, AI, notifications)
- Server Actions — mutations from frontend
- Shared Zod Schemas — front+back validation
- AppError — unified error class
- ApiResponse<T> — { success, data, error }

### Naming
- Files: kebab-case
- Components: PascalCase
- Hooks: camelCase with use prefix
- Types: PascalCase
- Zod schemas: camelCase + Schema suffix
- Server Actions: camelCase + Action suffix
- Enums: UPPER_SNAKE_CASE

### Import Order
1. React / Next.js
2. External libraries
3. @/core/*
4. @/server/*
5. @/components/*
6. @/hooks/*
7. @/lib/*
8. Relative

### Components
- Arrow functions
- Props destructured in arguments
- type ComponentNameProps = { ... }
- No React.FC
- Complex logic → custom hook
- Forms → react-hook-form + zodResolver

### Key Rules
- Supabase — Auth ONLY. Prisma — all data
- No default exports except page.tsx, layout.tsx
- Errors via new AppError(message, statusCode)
- Server Actions: try/catch → ApiResponse<T>

## Key Domain Model
`StrategyConfig` (JSON) — filled by AI and form, stored in DB. See `core/types/strategy.ts`.

## Session Workflow
Read SESSIONS.md for current progress. Each session focuses on specific features per the roadmap in PROJECT.md.
