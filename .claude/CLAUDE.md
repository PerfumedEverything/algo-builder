# AculaTrade — Project Rules

## Project State
- **Planning & tracking:** `.planning/STATE.md` (current position), `.planning/ROADMAP.md` (phases)
- **Project context:** `.planning/PROJECT.md` (requirements, decisions, architecture)
- **Audit backlog:** `.planning/phases/02-risk-metrics/AUDIT-2026-03-24.md`

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
- Repository Pattern — Supabase JS SDK repositories
- Service Layer — business logic in classes
- Provider Pattern — external APIs behind abstraction (broker, AI, notifications)
- Server Actions — mutations from frontend, always `try/catch → ApiResponse<T>`
- Shared Zod Schemas — front+back validation
- AppError — unified error class

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
- Supabase — Auth ONLY. All data via Supabase JS SDK repositories
- No default exports except page.tsx, layout.tsx
- Errors via new AppError(message, statusCode)
- Server Actions: always `await getCurrentUserId()` first, then business logic
- Every server action that takes entity ID must verify ownership (userId filter)

### Security Rules
- Server Actions: always auth check via `getCurrentUserId()`
- Entity access: always filter by userId — never trust client-supplied IDs
- External URLs: always `encodeURIComponent()` for user input
- File uploads: validate MIME type + size limit
- fetch() calls: always check `res.ok` before parsing
- AI prompts: limit input length (50k chars max)
- Admin routes: `assertAdmin()` on every action

### Deploy
- VPS: 5.42.121.212, Docker, aculatrade.com
- Deploy commands:
```
cd /opt/algo-builder && git pull
cd /opt/supabase/docker && docker compose stop
cd /opt/algo-builder && docker compose build nextjs --no-cache
cd /opt/supabase/docker && docker compose up -d
cd /opt/algo-builder && docker compose up -d nextjs && docker compose restart nginx
```

## Bug Fixing Rules — Root Cause First

- Do not fix symptoms before identifying the root cause
- Fix at the source-of-truth (owner layer), not where the symptom appears
- Avoid child-layer compensation (fallbacks, patches, duplicated logic, branching)
- Always do ultra-deep system research end-to-end before fixing:
  - top-down: route → page → container → orchestration → state
  - bottom-up: function → hook → service → API → DB
- Diagnose by layers: data/contracts → business logic → async/timing → UI state → integration → architecture
- If a bug appears in a child, inspect the parent/owner layer first
- When changing a mechanic, align all directly coupled layers: contracts, handlers, queries, cache, serializers, loading/error states
- Be skeptical of one-file fixes; justify why other layers are unaffected
- For frontend issues, inspect the full flow: route → layout → page → hooks → API → backend
- Prefer systemic fixes, but keep changes proportional
- If re-architecture is required, define scope, risks, compatibility, and rollout order

## Key Domain Model
`StrategyConfig` (JSON) — filled by AI and form, stored in DB. See `core/types/strategy.ts`.
