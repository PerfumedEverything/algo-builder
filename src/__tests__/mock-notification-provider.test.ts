import { describe, it, expect } from "vitest"
import { MockNotificationProvider } from "@/server/providers/notification/mock-notification-provider"

describe("MockNotificationProvider", () => {
  const provider = new MockNotificationProvider()

  it("send resolves without error", async () => {
    await expect(provider.send("chat-123", "test message")).resolves.toBeUndefined()
  })

  it("testConnection returns true", async () => {
    const result = await provider.testConnection("chat-123")
    expect(result).toBe(true)
  })
})
