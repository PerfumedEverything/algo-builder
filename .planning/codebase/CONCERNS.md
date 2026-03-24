# Codebase Concerns

**Analysis Date:** 2026-03-23

---

## Tech Debt

**Prisma schema declared but not used at runtime:**
- Issue: `prisma/schema.prisma` defines the full data model but the application uses Supabase JS SDK directly for all DB access. Prisma is not instantiated anywhere at runtime — `src/lib/prisma.ts` exists but no repository imports it.
- Files: `prisma/schema.prisma`, `src/lib/prisma.ts`, all files in `src/server/repositories/`
- Impact: Schema drifts silently. DB column additions (e.g. `positionState`, `repeatMode`, `role`, `blocked`) happen via raw SQL migrations in `prisma/migrations/` but are not reflected in a Prisma-generated client, meaning no type-safe query layer exists.
- Fix approach: Either adopt Prisma client fully (replace Supabase SDK calls in repositories) or remove Prisma entirely and treat raw SQL migrations as the source of truth with typed Supabase SDK.

**Broker token stored as plaintext in User table:**
- Issue: `brokerToken` is stored in plain text in the `User` table and retrieved directly via Supabase query in `BrokerRepository.getSettings()`.
- Files: `src/server/repositories/broker-repository.ts`, `prisma/schema.prisma`
- Impact: If the database is ever compromised, all users' T-Invest tokens are exposed. T-Invest tokens provide real money access.
- Fix approach: Encrypt broker tokens at rest using AES-256 with a server-side key before persisting; decrypt on read.

**`strategy.update()` accepts `Record<string, unknown>` with no validation:**
- Issue: `StrategyRepository.update()` spreads an untyped `Record<string, unknown>` directly into the Supabase `.update()` call. Any key can be set including `userId`, `status`, `positionState`.
- Files: `src/server/repositories/strategy-repository.ts` (line 98)
- Impact: Server actions calling `update()` could theoretically pass arbitrary fields. No safeguard at repository level.
- Fix approach: Replace with a typed `Partial<UpdateStrategyInput>` interface and whitelist updatable fields.

**Duplicated `getCandleRangeMs` and `EvalContext` types:**
- Issue: The `getCandleRangeMs` helper and `EvalContext` type are copy-pasted verbatim between `signal-checker.ts` and `strategy-checker.ts`.
- Files: `src/server/services/signal-checker.ts` (lines 382–396), `src/server/services/strategy-checker.ts` (lines 353–367)
- Impact: Changes to candle range logic must be applied in two places.
- Fix approach: Extract shared logic into `src/server/services/checker-utils.ts` and re-export.

**`getStatsForStrategies` iterates serially:**
- Issue: `OperationService.getStatsForStrategies()` calls `getStats()` in a sequential `for` loop, making N DB calls serially.
- Files: `src/server/services/operation-service.ts` (lines 97–106)
- Impact: Strategies page with 10+ strategies makes 10+ sequential DB round-trips.
- Fix approach: Use `Promise.all()` or batch into a single query with `strategyId IN (...)`.

**`getCurrentUser` and `getCurrentUserId` are duplicated:**
- Issue: Both functions in `src/server/actions/helpers.ts` repeat the same auth → DB lookup → create-if-missing logic. The only difference is the return type.
- Files: `src/server/actions/helpers.ts` (lines 13–71)
- Impact: Two places to maintain user creation on first login; divergence risk.
- Fix approach: Implement as a single `getOrCreateCurrentUser()` and let `getCurrentUserId` call it.

---

## Known Bugs

**`CROSSES_ABOVE` / `CROSSES_BELOW` conditions are evaluated as simple threshold comparisons:**
- Symptoms: Conditions named `CROSSES_ABOVE` and `CROSSES_BELOW` in indicator evaluation do not track actual crossover events — they return `actual > target` / `actual < target` on every tick, meaning the signal fires continuously as long as the condition holds, not just on the crossing event.
- Files: `src/server/services/signal-checker.ts` (lines 283–285), `src/server/services/strategy-checker.ts` (lines 233–235)
- Trigger: Any active signal/strategy using a CROSSES condition.
- Workaround: Users must use `repeatMode: false` to prevent continuous triggering, but that disables all future triggers.

**P&L calculation ignores lot sizes:**
- Symptoms: `OperationService.recordOperation()` uses `Math.floor(amount / price)` to compute quantity but then falls back to `Math.max(quantity, 1)`. For high-priced instruments (e.g. Норникель ~16,000 ₽) and small `tradeAmount` defaults, quantity is always 1. The resulting P&L math in `getStats()` then diverges from broker-reported values.
- Files: `src/server/services/operation-service.ts` (lines 15–26)
- Trigger: Strategies on any instrument where `price > tradeAmount / 1`.
- Workaround: Users set a high `tradeAmount` in strategy config.

**Bollinger Bands always returns `upper` band only:**
- Symptoms: When the `BOLLINGER` indicator is used in a signal/strategy condition, the evaluator always returns the upper band value (`bb.upper`). There is no way to compare against middle or lower bands.
- Files: `src/server/services/signal-checker.ts` (line 243), `src/server/services/strategy-checker.ts` (line 209)
- Trigger: Any signal/strategy using BOLLINGER indicator.
- Workaround: None within current UI.

**`getLastBuyPrice` returns operations in wrong order:**
- Symptoms: `OperationService.getLastBuyPrice()` calls `findByStrategyId()` and uses `.find()` (first match) on an unsorted array to get the last BUY. The actual "last" BUY depends on DB insertion order, not chronology.
- Files: `src/server/services/operation-service.ts` (lines 91–95)
- Trigger: Any strategy with multiple BUY operations where DB order differs from creation order.
- Workaround: None.

**`ABOVE_BY_PERCENT` / `BELOW_BY_PERCENT` conditions use `currentPrice` as the percentage threshold:**
- Symptoms: The `compare()` method for `ABOVE_BY_PERCENT` checks `((actual - target) / target) * 100 >= (currentPrice ?? 0)`. The right side should be the user-configured percentage, but `currentPrice` (e.g. 250.0) is passed instead, making the condition almost never trigger.
- Files: `src/server/services/signal-checker.ts` (lines 291–294), `src/server/services/strategy-checker.ts` (lines 241–245)
- Trigger: Any condition using `ABOVE_BY_PERCENT` or `BELOW_BY_PERCENT`.
- Workaround: Avoid using these condition types.

---

## Security Considerations

**Broker token exposed in server actions without rate limiting:**
- Risk: `connectBrokerAction` accepts an arbitrary token string and attempts to connect with it. No rate limiting exists on broker connection attempts.
- Files: `src/server/actions/broker-actions.ts`, `src/server/providers/broker/tinkoff-provider.ts`
- Current mitigation: Requires authenticated session (Supabase auth checked via `getCurrentUserId()`).
- Recommendations: Add rate limiting per user on broker connect attempts (e.g. 5/hour via Redis counter).

**Admin page does not enforce auth at the route level:**
- Risk: `src/app/(dashboard)/admin/page.tsx` is a client component that calls `getUsersAction()`. Role check happens inside the server action, but the page itself renders without an upfront auth redirect.
- Files: `src/app/(dashboard)/admin/page.tsx`, `src/server/actions/admin-actions.ts`
- Current mitigation: Server action throws `AppError.forbidden()` for non-admins, returning an error response.
- Recommendations: Add middleware-level or layout-level role guard for the `/admin` route to avoid rendering the page at all for non-admins.

**`getBrokersAction` has no auth guard:**
- Risk: `getBrokersAction` in `admin-actions.ts` returns all broker catalog rows without calling `assertAdmin()`.
- Files: `src/server/actions/admin-actions.ts` (lines 77–85)
- Current mitigation: Broker catalog is non-sensitive (names, logos, status).
- Recommendations: Consistent practice: all admin actions should call `assertAdmin()` for defense-in-depth.

**Supabase admin client is a module-level singleton:**
- Risk: `createAdminClient()` returns a shared `SupabaseClient<any>` singleton stored in module scope. In serverless/edge environments this is fine, but if ever deployed with persistent workers, the service-role client could be shared across requests.
- Files: `src/lib/supabase/admin.ts`
- Current mitigation: Non-issue with stateless Next.js Server Actions.
- Recommendations: Document the serverless assumption; if moving to persistent server, refactor to per-request instantiation.

**Price stream worker uses `CRON_SECRET` in Authorization header over HTTP internally:**
- Risk: `scripts/price-stream-worker.ts` sends `CRON_SECRET` via `Authorization: Bearer` to the Next.js API. If `NEXT_PUBLIC_APP_URL` is HTTP (not HTTPS) in production, the secret is transmitted in plaintext.
- Files: `scripts/price-stream-worker.ts` (lines 290–300)
- Current mitigation: VPS internal network only (nginx reverse proxy).
- Recommendations: Enforce HTTPS for `NEXT_PUBLIC_APP_URL` in production; add validation in `getEnv()`.

---

## Performance Bottlenecks

**Portfolio fetch makes N instrument resolution calls sequentially inside `Promise.all`:**
- Problem: `TinkoffProvider.getPortfolio()` calls `client.instruments.getInstrumentBy()` for every position in a `Promise.all`. With 20 positions this is 20 concurrent gRPC calls.
- Files: `src/server/providers/broker/tinkoff-provider.ts` (lines 145–187)
- Cause: No caching of instrument metadata (ticker/name); resolved on every portfolio load.
- Improvement path: Cache `figi → {ticker, name}` in Redis with long TTL (e.g. 7 days); skip the resolution call if cached.

**Portfolio page polls every 10 seconds regardless of market hours:**
- Problem: `src/app/(dashboard)/portfolio/page.tsx` runs `setInterval` at 10s to refresh portfolio via a full server action call, with no awareness of market open/close.
- Files: `src/app/(dashboard)/portfolio/page.tsx` (lines 48–55)
- Cause: Polling design; no subscription mechanism.
- Improvement path: Subscribe to Redis `price-updates` channel via Server-Sent Events or WebSocket; update portfolio client-side from price deltas.

**`redis.keys()` used for instrument tracking:**
- Problem: `PriceCache.getAllTrackedInstruments()` calls `redis.keys("price:*")`, which is an O(N) blocking scan on all Redis keys.
- Files: `src/server/services/price-cache.ts` (lines 72–75)
- Cause: No dedicated set/sorted set for tracked instruments.
- Improvement path: Maintain a Redis Set (`tracked-instruments`) and use `SADD`/`SMEMBERS`; remove `keys()` call.

---

## Fragile Areas

**`DeepSeekProvider.validateConfig()` mutates the AI response to patch structural variance:**
- Files: `src/server/providers/ai/deepseek-provider.ts` (lines 271–322)
- Why fragile: The validator handles two possible AI response shapes (flat vs. nested config) via type assertions (`as Record<string, unknown>`). If the AI returns a third shape, it throws a generic error that gives the user no actionable feedback.
- Safe modification: Add Zod schema validation for the AI function call output instead of manual structural checks.
- Test coverage: No tests for the AI provider's validation path.

**`StrategyChecker.handleTriggered()` does not rollback on partial failure:**
- Files: `src/server/services/strategy-checker.ts` (lines 263–319)
- Why fragile: The method updates `positionState`, records an operation, and sends a Telegram message — three separate side effects. If operation recording fails, `positionState` is already flipped. The strategy will now check exit conditions while no DB operation exists, leading to P&L calculation errors.
- Safe modification: Wrap positionState update and operation insert in a single Supabase transaction, or reverse the state on operation failure.
- Test coverage: Integration tests do not cover partial-failure scenarios.

**`price-stream-worker.ts` has no process supervision:**
- Files: `scripts/price-stream-worker.ts`
- Why fragile: The worker is a Node.js script. If the Tinkoff gRPC stream errors silently (no `lastPriceUpdate` refresh within 120s), the health check reconnects — but if `main()` itself throws before the health check starts, the process exits and no signals/strategies are checked until manual restart.
- Safe modification: Wrap in a process manager (PM2 with `--exp-backoff-restart-delay`); add `/health` endpoint the worker can ping.
- Test coverage: None.

**Cron endpoint has no idempotency guard:**
- Files: `src/app/api/signals/check/route.ts`
- Why fragile: If the cron fires twice simultaneously (e.g. timeout retry), two `SignalChecker.checkAll()` calls run in parallel, each independently triggering signals, writing `SignalLog` entries, and sending Telegram notifications — producing duplicate alerts.
- Safe modification: Use a Redis distributed lock (`SET nx ex`) at the start of `checkAll()` to prevent concurrent runs.
- Test coverage: None.

---

## Scaling Limits

**Single system Tinkoff token for all real-time price streaming:**
- Current capacity: One `TINKOFF_SYSTEM_TOKEN` used by the price-stream-worker for all subscriptions.
- Limit: T-Invest gRPC streaming has per-token subscription limits. At scale (hundreds of active instruments), a single token subscription will hit API rate limits.
- Scaling path: Shard instruments across multiple system tokens; implement a pool in the worker.

**All users share the same `getBrokerProvider()` singleton factory:**
- Current capacity: `getBrokerProvider()` always returns a fresh `TinkoffProvider` instance, but each instance re-authenticates on every service call via `connect(token)`.
- Limit: Each strategy/signal check re-calls `connect()` which makes a gRPC `getAccounts` call to validate. Under load, N active users × M checks = N×M gRPC auth calls per cron cycle.
- Scaling path: Implement a per-token broker connection pool with connection reuse and TTL.

---

## Dependencies at Risk

**`tinkoff-invest-api` — unofficial community SDK:**
- Risk: Package is community-maintained, not by T-Bank. Last verified active but could fall behind Tinkoff API v2 changes.
- Impact: All broker connectivity, price streaming, and portfolio data breaks if the SDK stops being maintained.
- Migration plan: Abstract behind `BrokerProvider` interface (already done) — migration to official SDK or direct gRPC requires implementing a new provider class only.

**`technicalindicators` — unmaintained:**
- Risk: Package has had no significant updates in years; no TypeScript-native alternative is bundled.
- Impact: Indicator calculation bugs would require forking the package or replacing.
- Migration plan: Replace with `tulip-node` or custom implementations (RSI/SMA/EMA are trivial); higher risk for MACD/Bollinger.

---

## Test Coverage Gaps

**Signal and strategy checker `compare()` logic:**
- What's not tested: The `ABOVE_BY_PERCENT`, `BELOW_BY_PERCENT`, `CROSSES_ABOVE`, `CROSSES_BELOW`, `MULTIPLIED_BY` branches in `compare()`.
- Files: `src/server/services/signal-checker.ts`, `src/server/services/strategy-checker.ts`
- Risk: Logic bugs in these conditions (documented above) exist precisely because they are untested.
- Priority: High

**`handleTriggered` side-effect chain:**
- What's not tested: The full `handleTriggered` flow in both checkers — DB update + operation recording + Telegram send — under failure conditions.
- Files: `src/server/services/strategy-checker.ts` (lines 263–319), `src/server/services/signal-checker.ts` (lines 312–349)
- Risk: Partial failure leaves data in inconsistent state silently.
- Priority: High

**`DeepSeekProvider` AI response validation:**
- What's not tested: `validateConfig()` with malformed/incomplete AI function call responses.
- Files: `src/server/providers/ai/deepseek-provider.ts`
- Risk: AI variability can produce unexpected shapes; untested paths throw generic errors.
- Priority: Medium

**`BrokerService` methods using real provider:**
- What's not tested: `BrokerService` has no unit tests. Only `MockBrokerProvider` is tested.
- Files: `src/server/services/broker-service.ts`
- Risk: Regressions in broker connect/disconnect/portfolio flow go undetected.
- Priority: Medium

**`OperationService.getStats()` P&L calculation:**
- What's not tested: Edge cases — zero buys, more sells than buys, `currentPrice` undefined.
- Files: `src/server/services/operation-service.ts`
- Risk: Financial calculation bugs in user-facing P&L display.
- Priority: High

---

*Concerns audit: 2026-03-23*
