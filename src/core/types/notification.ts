export type NotificationChannel = "max" | "telegram"

export type NotificationMessage = {
  title: string
  body: string
  channel: NotificationChannel
}
