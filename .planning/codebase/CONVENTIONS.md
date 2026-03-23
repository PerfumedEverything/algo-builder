# Coding Conventions

**Analysis Date:** 2026-03-23

## Naming Patterns

**Files:**
- kebab-case for all files: `strategy-actions.ts`, `fifo-calculator.ts`, `broker-catalog-repository.ts`
- Exception: Next.js reserved names use lowercase: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Test files: `kebab-case.test.ts` in `src/__tests__/`

**Functions/Methods:**
- camelCase for functions and methods: `getStrategies`, `getCurrentUserId`, `evaluateCondition`
- Server Actions named with `Action` suffix: `getStrategiesAction`, `createStrategyAction`, `deleteStrategyAction`
- Hooks named with `use` prefix: `useSidebarStore`, `useStrategyStore`

**Variables:**
- camelCase: `userId`, `mockOps`, `totalAmount`
- Enums/status literals: UPPER_SNAKE_CASE strings used as union literals: `"DRAFT"`, `"ACTIVE"`, `"GREATER_THAN"`, `"OPERATION_STATE_EXECUTED"`

**Types/Interfaces:**
- PascalCase: `StrategyConfig`, `BrokerAccount`, `ApiResponse<T>`, `StrategyRow`
- Props types inline as `type ComponentNameProps = { ... }` (not used in observed files — simple components destructure directly)
- Row types for DB shapes: `StrategyRow`, `BrokerRow`

**Classes:**
- PascalCase: `TinkoffProvider`, `StrategyService`, `FifoCalculator`, `AppError`, `StrategyRepository`

**Zod Schemas:**
- camelCase + `Schema` suffix: `createStrategySchema`, `strategyConfigSchema`, `indicatorTypeSchema`

## Code Style

**Formatting:**
- No Prettier config found — relies on ESLint `next/core-web-vitals` + `next/typescript`
- 2-space indentation observed throughout
- No trailing semicolons (semicolons are present — standard JS style)
- Double quotes for strings in source files

**Linting:**
- ESLint flat config: `eslint.config.mjs`
- Extends `next/core-web-vitals` and `next/typescript`
- Ignores: `node_modules/**`, `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- No `any` — TypeScript strict mode enforced

**TypeScript:**
- `strict: true` in `tsconfig.json`
- Module resolution: `bundler`
- Path alias: `@/*` maps to `./src/*`
- Explicit types on class properties and method signatures
- Avoid `as any` — use type assertions like `as unknown as Record<string, unknown>` when unavoidable
- Type imports use `import type { ... }` syntax

## Import Organization

**Order (enforced by convention, see CLAUDE.md):**
1. React / Next.js: `import { useState } from "react"`, `import Link from "next/link"`
2. External libraries: `import { TinkoffInvestApi } from "tinkoff-invest-api"`
3. `@/core/*`: types, schemas, errors, config
4. `@/server/*`: repositories, services, providers, actions
5. `@/components/*`: UI components
6. `@/hooks/*`: Zustand stores, custom hooks
7. `@/lib/*`: Supabase client, Redis, utils
8. Relative: `import { getCurrentUserId } from "./helpers"`

**Path Aliases:**
- `@/` resolves to `src/`
- Examples: `@/core/types`, `@/server/services`, `@/components/ui/button`, `@/lib/supabase/server`

## Error Handling

**AppError class** (`src/core/errors/app-error.ts`):
```typescript
throw AppError.notFound("Strategy")   // 404
throw AppError.badRequest("msg")       // 400
throw AppError.unauthorized()          // 401
throw AppError.forbidden()             // 403
throw AppError.internal("msg")         // 500
```

**Server Actions** — wrap all logic in try/catch, return `ApiResponse<T>`:
```typescript
export const someAction = async (): Promise<ApiResponse<T>> => {
  try {
    const userId = await getCurrentUserId()
    const result = await service.doSomething(userId)
    return successResponse(result)
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Unknown error")
  }
}
```

**Repositories** — throw `new Error(error.message)` on Supabase errors:
```typescript
const { data, error } = await supabase.from("Strategy").select("*")
if (error) throw new Error(error.message)
return (data ?? []) as StrategyRow[]
```

**Providers** — throw descriptive Russian-language strings for user-facing errors:
```typescript
throw new Error("Брокер не подключён")
throw new Error(`Инструмент "${ticker}" не найден`)
```

**Client components** — catch errors and display via `toast.error()` from `sonner`

## API Response Pattern

**`ApiResponse<T>`** (`src/core/types/api.ts`):
```typescript
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

// Usage in client:
const result = await someAction()
if (result.success) {
  // use result.data
} else {
  toast.error(result.error)
}
```

## Validation

**Zod** used at both schema definition and at action boundaries:
- Schemas defined in `src/core/schemas/` shared across front and back
- Server Actions call `schema.safeParse(data)` before processing
- Services call `schema.safeParse(data.config)` for nested objects
- Failed parse returns `errorResponse(parsed.error.issues[0].message)`

## Logging

- No logging framework — `console` not observed in source files
- Errors surfaced through `ApiResponse<T>` pattern, not logged server-side
- Provider errors thrown and caught by actions

## Comments

- No inline code comments (enforced by CLAUDE.md rule)
- No JSDoc/TSDoc observed
- Self-documenting naming expected

## Function Design

**Size:** Files capped at 150 lines per CLAUDE.md rule
**Parameters:** Plain objects for multi-param functions, not positional args
**Return Values:** Explicit return types on Server Actions, optional on service methods
**Early return:** Used over nested if-else (e.g., `if (!strategy) throw ...`)
**Guard clauses:** `ensureConnected()` private method pattern in providers

## Class Design

**Constructor injection** for dependencies (enables testing):
```typescript
export class StrategyService {
  constructor(
    private repository = new StrategyRepository(),
    private aiProvider?: AiProvider,
  ) {}
}
```

**Static methods** for pure calculations: `FifoCalculator.calculate(ops, price)`, `FifoCalculator.calculateSummary(ops, price)`

## Component Design

**Arrow function components** (no `React.FC`):
```typescript
export const LoginForm = () => {
  // ...
}
```

**No default exports** except `page.tsx`, `layout.tsx`
**Named exports** for all other components: `export const LoginForm`
**Barrel exports** via `index.ts` in each module (`src/components/broker/index.ts`, `src/server/repositories/index.ts`)

## Module Structure

**Provider Pattern** — external APIs behind interface:
- Interface in `types.ts`
- Real implementation: `tinkoff-provider.ts`, `deepseek-provider.ts`
- Mock: `mock-broker-provider.ts`, `mock-ai-provider.ts`
- Factory in `index.ts`: `getBrokerProvider()`, `getAiProvider()`

**Barrel exports:**
```typescript
// src/server/repositories/index.ts
export { StrategyRepository } from "./strategy-repository"
export { SignalRepository } from "./signal-repository"
// etc.
```

---

*Convention analysis: 2026-03-23*
