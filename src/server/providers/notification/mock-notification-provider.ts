import type { NotificationProvider } from "./types"

export class MockNotificationProvider implements NotificationProvider {
  async send(chatId: string, message: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log(`[MockNotification] Message sent to ${chatId}: ${message}`)
  }

  async testConnection(_chatId: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return true
  }
}
