---
phase: 17-smoke-monitor-test-coverage
type: validation
---

# Phase 17 Validation

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run (single file) | `npx vitest run src/__tests__/<file>.test.ts` |
| Full suite | `npm test` (= `npx vitest run`) |

## Requirement → Automated Verify Map

| Req ID | Behavior | Automated Command |
|--------|----------|-------------------|
| SMOKE-01 | Smoke sends Telegram on failure | `npx vitest run src/__tests__/smoke/smoke-monitor.test.ts` |
| SMOKE-02 | API endpoints return expected status codes (probeHealth, probePricesEndpoint) | `npx vitest run src/__tests__/smoke/smoke-monitor.test.ts` |
| SMOKE-03 | Worker heartbeats are fresh (probePriceWorker, probeBybitWorker) | `npx vitest run src/__tests__/smoke/smoke-monitor.test.ts` |
| SMOKE-04 | Broker/DB connectivity probe (probeActiveStrategies, probeDatabase) | `npx vitest run src/__tests__/smoke/smoke-monitor.test.ts` |
| TEST-01 | BrokerService all public methods | `npx vitest run src/__tests__/broker-service.test.ts` |
| TEST-02 | StrategyService all public methods | `npx vitest run src/__tests__/strategy-service.test.ts` |
| TEST-03 | PortfolioAnalyticsService >= 80% coverage | `npx vitest run src/__tests__/portfolio-analytics-service.test.ts` |
| TEST-04 | IndicatorCalculator edge cases | `npx vitest run src/__tests__/indicator-calculator.test.ts` |
| TEST-05 | Server actions integration (broker + strategy + grid) | `npx vitest run src/__tests__/actions/` |

## Baseline Gate (Wave 1 exit)

Before any new tests are added, the baseline must be green:

```bash
cd /Users/daratimofeeva/Desktop/Projects/web/algo-builder && npx vitest run 2>&1 | tail -5
```

Expected: output contains `0 failed`, exit code 0, total count >= 580.

## Per-Plan Verify Commands

| Plan | Verify Command |
|------|----------------|
| 17-01 | `npx vitest run 2>&1 \| tail -5` (full suite, must show 0 failed) |
| 17-02 | `test -f scripts/smoke-probes.ts && test -f scripts/smoke-monitor.ts && test -f Dockerfile.smoke && grep -c "smoke-runner" docker-compose.yml && npx vitest run src/__tests__/smoke/smoke-monitor.test.ts 2>&1 \| tail -5` |
| 17-03 | `npx vitest run src/__tests__/broker-service.test.ts src/__tests__/strategy-service.test.ts 2>&1 \| tail -5` |
| 17-04 | `npx vitest run src/__tests__/actions/ 2>&1 \| tail -5` |
| 17-05 | `npx vitest run src/__tests__/portfolio-analytics-service.test.ts src/__tests__/indicator-calculator.test.ts 2>&1 \| tail -5` |

## Phase Gate (all plans complete)

```bash
cd /Users/daratimofeeva/Desktop/Projects/web/algo-builder && npm test 2>&1 | tail -10
```

Expected:
- Exit code 0
- 0 failing tests
- Total tests >= 650 (580 baseline + ~70 new tests across plans 17-02 through 17-05)

## Smoke Infrastructure Verify

```bash
# Files exist
test -f scripts/smoke-probes.ts && echo "smoke-probes OK"
test -f scripts/smoke-monitor.ts && echo "smoke-monitor OK"
test -f Dockerfile.smoke && echo "Dockerfile.smoke OK"
test -f src/app/api/health/route.ts && echo "health route OK"

# Probe functions exported
grep -c "export.*probe" scripts/smoke-probes.ts

# Heartbeat writes present
grep "worker:heartbeat" scripts/price-stream-worker.ts
grep "bybit-worker:heartbeat" scripts/bybit-stream-worker.ts

# Docker compose updated
grep "smoke-runner" docker-compose.yml
```

## Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/[changed-file].test.ts`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green (0 failures) before `/gsd:verify-work`
