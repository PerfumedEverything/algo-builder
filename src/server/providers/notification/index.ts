import { getEnv } from "@/core/config/env"
import type { NotificationProvider } from "./types"
import { MockNotificationProvider } from "./mock-notification-provider"
import { TelegramProvider } from "./telegram-provider"

export type { NotificationProvider }
export { MockNotificationProvider }
export { MaxProvider } from "./max-provider"
export { TelegramProvider }

export const getNotificationProvider = (): NotificationProvider => {
  const env = getEnv()

  if (env.TELEGRAM_BOT_TOKEN) {
    return new TelegramProvider(env.TELEGRAM_BOT_TOKEN)
  }

  return new MockNotificationProvider()
}
