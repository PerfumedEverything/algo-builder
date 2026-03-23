import { Bot } from "grammy"
import type { NotificationProvider } from "./types"

export class TelegramProvider implements NotificationProvider {
  private bot: Bot

  constructor(token: string) {
    this.bot = new Bot(token)
  }

  async send(chatId: string, message: string): Promise<void> {
    await this.bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" })
  }

  async testConnection(chatId: string): Promise<boolean> {
    try {
      await this.bot.api.sendMessage(
        chatId,
        "✅ *AculaTrade* — тестовое уведомление\n\nВсё настроено, уведомления работают!",
        { parse_mode: "Markdown" },
      )
      return true
    } catch {
      return false
    }
  }
}
