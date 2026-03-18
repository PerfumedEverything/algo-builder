import { UserRepository } from "@/server/repositories"
import { getNotificationProvider } from "@/server/providers/notification"

export class NotificationService {
  private repo = new UserRepository()
  private provider = getNotificationProvider()

  async saveMaxChatId(userId: string, chatId: string): Promise<void> {
    await this.repo.updateMaxChatId(userId, chatId)
  }

  async removeMaxChatId(userId: string): Promise<void> {
    await this.repo.updateMaxChatId(userId, null)
  }

  async saveTelegramChatId(userId: string, chatId: string): Promise<void> {
    await this.repo.updateTelegramChatId(userId, chatId)
  }

  async removeTelegramChatId(userId: string): Promise<void> {
    await this.repo.updateTelegramChatId(userId, null)
  }

  async testNotification(userId: string): Promise<boolean> {
    const user = await this.repo.findById(userId)
    const chatId = user?.telegramChatId ?? user?.maxChatId
    if (!chatId) return false
    return this.provider.testConnection(chatId)
  }

  async sendNotification(userId: string, message: string): Promise<void> {
    const user = await this.repo.findById(userId)
    const chatId = user?.telegramChatId ?? user?.maxChatId
    if (!chatId) return
    await this.provider.send(chatId, message)
  }

  async getSettings(userId: string) {
    const user = await this.repo.findById(userId)
    return {
      maxChatId: user?.maxChatId ?? null,
      telegramChatId: user?.telegramChatId ?? null,
      name: user?.name ?? null,
      email: user?.email ?? null,
    }
  }

  async updateProfile(userId: string, name: string): Promise<void> {
    await this.repo.updateProfile(userId, { name })
  }
}
