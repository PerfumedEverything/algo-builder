import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.hoisted(() => vi.fn())
const mockRedisGet = vi.hoisted(() => vi.fn())
const mockRedisPing = vi.hoisted(() => vi.fn())
const mockRedisKeys = vi.hoisted(() => vi.fn())
const mockSupabaseSelect = vi.hoisted(() => vi.fn())

vi.stubGlobal("fetch", mockFetch)

const mockRedis = {
  get: mockRedisGet,
  ping: mockRedisPing,
  keys: mockRedisKeys,
}

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  limit: vi.fn(),
}

const mockSupabase = {
  from: vi.fn().mockReturnValue(mockSupabaseChain),
}

import {
  probeHealth,
  probeRedis,
  probeDatabase,
  probePriceWorker,
  probeBybitWorker,
  probeCandleCache,
  probeActiveStrategies,
  probeSignalsCheck,
  probePricesEndpoint,
} from "../../../scripts/smoke-probes"

describe("probeHealth", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns ok:true when fetch returns 200 with ok:true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const result = await probeHealth("http://localhost:3000")
    expect(result.ok).toBe(true)
    expect(result.name).toBe("health")
  })

  it("returns ok:false when fetch returns 500", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const result = await probeHealth("http://localhost:3000")
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("500")
  })

  it("returns ok:false when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("connection refused"))
    const result = await probeHealth("http://localhost:3000")
    expect(result.ok).toBe(false)
  })
})

describe("probeRedis", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns ok:true when ping returns PONG", async () => {
    mockRedisPing.mockResolvedValueOnce("PONG")
    const result = await probeRedis(mockRedis as never)
    expect(result.ok).toBe(true)
    expect(result.name).toBe("redis")
  })

  it("returns ok:false when ping throws", async () => {
    mockRedisPing.mockRejectedValueOnce(new Error("redis unavailable"))
    const result = await probeRedis(mockRedis as never)
    expect(result.ok).toBe(false)
  })
})

describe("probePriceWorker", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns ok:true when heartbeat is fresh", async () => {
    mockRedisGet.mockResolvedValueOnce(String(Date.now() - 30_000))
    const result = await probePriceWorker(mockRedis as never)
    expect(result.ok).toBe(true)
  })

  it("returns ok:false when heartbeat is stale", async () => {
    mockRedisGet.mockResolvedValueOnce(String(Date.now() - 200_000))
    const result = await probePriceWorker(mockRedis as never)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("stale")
  })

  it("returns ok:false when heartbeat key is null", async () => {
    mockRedisGet.mockResolvedValueOnce(null)
    const result = await probePriceWorker(mockRedis as never)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("missing")
  })
})

describe("probeBybitWorker", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns ok:true with reason when key is null (not enabled)", async () => {
    mockRedisGet.mockResolvedValueOnce(null)
    const result = await probeBybitWorker(mockRedis as never)
    expect(result.ok).toBe(true)
    expect(result.reason).toContain("not enabled")
  })

  it("returns ok:true when heartbeat is fresh", async () => {
    mockRedisGet.mockResolvedValueOnce(String(Date.now() - 10_000))
    const result = await probeBybitWorker(mockRedis as never)
    expect(result.ok).toBe(true)
  })

  it("returns ok:false when heartbeat is stale", async () => {
    mockRedisGet.mockResolvedValueOnce(String(Date.now() - 200_000))
    const result = await probeBybitWorker(mockRedis as never)
    expect(result.ok).toBe(false)
  })
})

describe("probeDatabase", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSupabase.from.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
  })

  it("returns ok:true when supabase returns no error", async () => {
    mockSupabaseChain.limit.mockResolvedValueOnce({ data: [{ id: "1" }], error: null })
    const result = await probeDatabase(mockSupabase as never)
    expect(result.ok).toBe(true)
    expect(result.name).toBe("database")
  })

  it("returns ok:false when supabase returns error", async () => {
    mockSupabaseChain.limit.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })
    const result = await probeDatabase(mockSupabase as never)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("DB error")
  })
})

describe("probeCandleCache", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns ok:true when candle keys exist", async () => {
    mockRedisKeys.mockResolvedValueOnce(["candles:SBER:1h", "candles:LKOH:1d"])
    const result = await probeCandleCache(mockRedis as never)
    expect(result.ok).toBe(true)
  })

  it("returns ok:false when no candle keys exist", async () => {
    mockRedisKeys.mockResolvedValueOnce([])
    const result = await probeCandleCache(mockRedis as never)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("no candle keys")
  })
})

describe("probeActiveStrategies (SMOKE-04)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSupabase.from.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
  })

  it("returns ok:true when active strategies exist", async () => {
    mockSupabaseChain.eq.mockResolvedValueOnce({ data: [{ id: "1" }, { id: "2" }], error: null })
    const result = await probeActiveStrategies(mockSupabase as never)
    expect(result.ok).toBe(true)
    expect(result.name).toBe("active-strategies")
  })

  it("returns ok:false when no active strategies", async () => {
    mockSupabaseChain.eq.mockResolvedValueOnce({ data: [], error: null })
    const result = await probeActiveStrategies(mockSupabase as never)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("no active strategies")
  })

  it("returns ok:false when supabase returns error", async () => {
    mockSupabaseChain.eq.mockResolvedValueOnce({ data: null, error: { message: "query failed" } })
    const result = await probeActiveStrategies(mockSupabase as never)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("query failed")
  })
})

describe("probeSignalsCheck", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns ok:true when endpoint responds 200", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })
    const result = await probeSignalsCheck("http://localhost:3000", "secret")
    expect(result.ok).toBe(true)
  })

  it("returns ok:false when endpoint returns 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    const result = await probeSignalsCheck("http://localhost:3000", "wrong")
    expect(result.ok).toBe(false)
  })
})

describe("probePricesEndpoint", () => {
  beforeEach(() => vi.resetAllMocks())

  it("returns ok:true when endpoint returns 401 (proves endpoint alive)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    const result = await probePricesEndpoint("http://localhost:3000")
    expect(result.ok).toBe(true)
  })

  it("returns ok:false when endpoint returns unexpected status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const result = await probePricesEndpoint("http://localhost:3000")
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("500")
  })
})
