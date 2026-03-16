import type { NotificationProvider } from "./types"

export class MaxProvider implements NotificationProvider {
  async send(_chatId: string, _message: string): Promise<void> {
    throw new Error("MaxProvider: requires MAX_BOT_TOKEN")
  }

  async testConnection(_chatId: string): Promise<boolean> {
    throw new Error("MaxProvider: requires MAX_BOT_TOKEN")
  }
}
