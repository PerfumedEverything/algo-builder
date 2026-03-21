import { describe, it, expect, vi, beforeEach } from "vitest"
import type { BrokerRow, CreateBrokerInput } from "@/server/repositories/broker-catalog-repository"

const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  order: mockOrder,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/logo.png" } })),
      })),
    },
  })),
}))

const { BrokerCatalogRepository } = await import("@/server/repositories/broker-catalog-repository")

const makeBroker = (overrides: Partial<BrokerRow> = {}): BrokerRow => ({
  id: "test-id",
  name: "Test Broker",
  description: "Test description",
  logoUrl: null,
  logoEmoji: "",
  status: "ACTIVE",
  providerKey: "TEST",
  sortOrder: 1,
  createdAt: "2026-03-21T00:00:00Z",
  updatedAt: "2026-03-21T00:00:00Z",
  ...overrides,
})

describe("BrokerCatalogRepository", () => {
  let repo: InstanceType<typeof BrokerCatalogRepository>

  beforeEach(() => {
    repo = new BrokerCatalogRepository()
    vi.clearAllMocks()
  })

  describe("findAll", () => {
    it("returns brokers sorted by sortOrder", async () => {
      const brokers = [makeBroker({ sortOrder: 1 }), makeBroker({ id: "2", sortOrder: 2 })]
      mockOrder.mockResolvedValue({ data: brokers, error: null })
      mockSelect.mockReturnValue({ order: mockOrder })

      const result = await repo.findAll()

      expect(result).toHaveLength(2)
      expect(mockFrom).toHaveBeenCalledWith("Broker")
      expect(mockSelect).toHaveBeenCalledWith("*")
      expect(mockOrder).toHaveBeenCalledWith("sortOrder", { ascending: true })
    })

    it("returns empty array when no data", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null })
      mockSelect.mockReturnValue({ order: mockOrder })

      const result = await repo.findAll()

      expect(result).toEqual([])
    })

    it("throws on error", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } })
      mockSelect.mockReturnValue({ order: mockOrder })

      await expect(repo.findAll()).rejects.toThrow("DB error")
    })
  })

  describe("findById", () => {
    it("returns broker by id", async () => {
      const broker = makeBroker()
      mockSingle.mockResolvedValue({ data: broker, error: null })
      mockEq.mockReturnValue({ single: mockSingle })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await repo.findById("test-id")

      expect(result).toEqual(broker)
      expect(mockEq).toHaveBeenCalledWith("id", "test-id")
    })

    it("returns null when not found", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } })
      mockEq.mockReturnValue({ single: mockSingle })
      mockSelect.mockReturnValue({ eq: mockEq })

      const result = await repo.findById("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("create", () => {
    it("creates broker with defaults", async () => {
      const input: CreateBrokerInput = {
        name: "New Broker",
        providerKey: "NEW",
      }
      const created = makeBroker({ name: "New Broker", providerKey: "NEW" })

      mockSingle.mockResolvedValue({ data: created, error: null })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockInsert.mockReturnValue({ select: mockSelect })

      const result = await repo.create(input)

      expect(result.name).toBe("New Broker")
      expect(result.providerKey).toBe("NEW")
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: "New Broker",
        providerKey: "NEW",
        status: "LOCKED",
        logoEmoji: "",
        sortOrder: 0,
      }))
    })

    it("throws on duplicate providerKey", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "duplicate key" } })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockInsert.mockReturnValue({ select: mockSelect })

      await expect(
        repo.create({ name: "Dup", providerKey: "TINKOFF" }),
      ).rejects.toThrow("duplicate key")
    })
  })

  describe("delete", () => {
    it("deletes broker", async () => {
      mockEq.mockResolvedValue({ error: null })
      mockDelete.mockReturnValue({ eq: mockEq })

      await expect(repo.delete("test-id")).resolves.toBeUndefined()
      expect(mockEq).toHaveBeenCalledWith("id", "test-id")
    })

    it("throws on error", async () => {
      mockEq.mockResolvedValue({ error: { message: "Cannot delete" } })
      mockDelete.mockReturnValue({ eq: mockEq })

      await expect(repo.delete("test-id")).rejects.toThrow("Cannot delete")
    })
  })
})

describe("BrokerRow types", () => {
  it("has required fields", () => {
    const broker = makeBroker()
    expect(broker).toHaveProperty("id")
    expect(broker).toHaveProperty("name")
    expect(broker).toHaveProperty("providerKey")
    expect(broker).toHaveProperty("status")
    expect(broker).toHaveProperty("sortOrder")
    expect(broker).toHaveProperty("logoUrl")
    expect(broker).toHaveProperty("logoEmoji")
  })

  it("status is valid enum value", () => {
    const validStatuses = ["ACTIVE", "LOCKED", "COMING_SOON"]
    const broker = makeBroker()
    expect(validStatuses).toContain(broker.status)
  })
})
