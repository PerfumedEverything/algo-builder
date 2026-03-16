import type { NotificationProvider } from "./types"
import { MockNotificationProvider } from "./mock-notification-provider"

export type { NotificationProvider }
export { MockNotificationProvider }
export { MaxProvider } from "./max-provider"

export const getNotificationProvider = (): NotificationProvider => {
  return new MockNotificationProvider()
}
