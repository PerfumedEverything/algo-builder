import type { NotificationProvider } from "./types"

export class MockNotificationProvider implements NotificationProvider {
  async send(_chatId: string, _message: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log(`[MockNotification] Message sent to ${_chatId}: ${_message}`)
  }

  async testConnection(_chatId: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return true
  }
}
