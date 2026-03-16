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

  async testNotification(userId: string): Promise<boolean> {
    const user = await this.repo.findById(userId)
    if (!user?.maxChatId) return false
    return this.provider.testConnection(user.maxChatId)
  }

  async sendNotification(userId: string, message: string): Promise<void> {
    const user = await this.repo.findById(userId)
    if (!user?.maxChatId) return
    await this.provider.send(user.maxChatId, message)
  }

  async getSettings(userId: string) {
    const user = await this.repo.findById(userId)
    return {
      maxChatId: user?.maxChatId ?? null,
      name: user?.name ?? null,
      email: user?.email ?? null,
    }
  }

  async updateProfile(userId: string, name: string): Promise<void> {
    await this.repo.updateProfile(userId, { name })
  }
}
