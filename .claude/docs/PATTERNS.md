# AlgoBuilder — Code Patterns

## AppError
```typescript
// core/errors/app-error.ts
class AppError extends Error {
  constructor(public message: string, public statusCode: number) { ... }
  static badRequest(msg: string) { return new AppError(msg, 400) }
  static unauthorized() { return new AppError("Unauthorized", 401) }
  static notFound(entity: string) { return new AppError(`${entity} not found`, 404) }
}
```

## ApiResponse
```typescript
// core/types/api.ts
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }
```

## Server Action Pattern
```typescript
// server/actions/example-actions.ts
const someAction = async (input: Input): Promise<ApiResponse<Output>> => {
  try {
    const parsed = someSchema.parse(input)
    const result = await someService.doSomething(parsed)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message }
    return { success: false, error: "Internal error" }
  }
}
```

## Repository Pattern
```typescript
// server/repositories/base-repository.ts
// Each repository wraps Prisma operations for one model
// Methods: findById, findMany, create, update, delete
```

## Provider Pattern
```typescript
// server/providers/ai/ai-provider.interface.ts
interface AiProviderInterface {
  generateStrategy(prompt: string): Promise<StrategyConfig>
}
// Implementations: ClaudeProvider, DeepSeekProvider
// Switch via env.AI_PROVIDER
```

## Zustand Store
```typescript
// hooks/use-strategy-store.ts
// Store holds StrategyConfig state for the form
// Methods: setEntry, setExit, setRisks, setFromAI(config), reset
```
