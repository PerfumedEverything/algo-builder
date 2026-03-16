export interface NotificationProvider {
  send(chatId: string, message: string): Promise<void>
  testConnection(chatId: string): Promise<boolean>
}
