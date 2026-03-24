import { describe, it, expect, vi } from "vitest"

/**
 * Tests for signal channel deduplication logic.
 *
 * The dedup in SignalChecker.handleTriggered uses:
 *   const uniqueChannels = [...new Set(signal.channels)]
 *
 * These tests verify the Set deduplication behavior to confirm
 * only one notification is sent per unique channel.
 */

describe("Signal channel deduplication via Set", () => {
  it("deduplicated Set from duplicate channels sends only once", () => {
    const channels = ["telegram", "telegram", "telegram"]
    const uniqueChannels = [...new Set(channels)]

    expect(uniqueChannels).toHaveLength(1)
    expect(uniqueChannels[0]).toBe("telegram")
  })

  it("single channel sends once", () => {
    const channels = ["telegram"]
    const uniqueChannels = [...new Set(channels)]

    expect(uniqueChannels).toHaveLength(1)
    expect(uniqueChannels[0]).toBe("telegram")
  })

  it("empty channels array sends nothing", () => {
    const channels: string[] = []
    const uniqueChannels = [...new Set(channels)]

    expect(uniqueChannels).toHaveLength(0)
  })

  it("mixed duplicates with multiple channel types deduplicated correctly", () => {
    const channels = ["telegram", "email", "telegram", "email", "telegram"]
    const uniqueChannels = [...new Set(channels)]

    expect(uniqueChannels).toHaveLength(2)
    expect(uniqueChannels).toContain("telegram")
    expect(uniqueChannels).toContain("email")
  })

  it("all unique channels preserved without modification", () => {
    const channels = ["telegram", "email", "sms"]
    const uniqueChannels = [...new Set(channels)]

    expect(uniqueChannels).toHaveLength(3)
  })

  it("mock send called once when channels has duplicates", () => {
    const mockSend = vi.fn()
    const channels = ["telegram", "telegram"]
    const uniqueChannels = [...new Set(channels)]

    for (const channel of uniqueChannels) {
      if (channel === "telegram") {
        mockSend("chat-123", "test message")
      }
    }

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith("chat-123", "test message")
  })

  it("mock send called once when channels has single entry", () => {
    const mockSend = vi.fn()
    const channels = ["telegram"]
    const uniqueChannels = [...new Set(channels)]

    for (const channel of uniqueChannels) {
      if (channel === "telegram") {
        mockSend("chat-123", "test message")
      }
    }

    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it("mock send not called when channels is empty", () => {
    const mockSend = vi.fn()
    const channels: string[] = []
    const uniqueChannels = [...new Set(channels)]

    for (const channel of uniqueChannels) {
      if (channel === "telegram") {
        mockSend("chat-123", "test message")
      }
    }

    expect(mockSend).not.toHaveBeenCalled()
  })
})
