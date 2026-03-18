import { NextResponse } from "next/server"
import { Bot, webhookCallback } from "grammy"

let _bot: Bot | null = null

const getBot = (): Bot | null => {
  if (_bot) return _bot
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null

  _bot = new Bot(token)

  _bot.command("start", async (ctx) => {
    const chatId = ctx.chat.id.toString()
    await ctx.reply(
      [
        "👋 *Добро пожаловать в AlgoBuilder!*",
        "",
        `🔑 Ваш Chat ID: \`${chatId}\``,
        "",
        "📋 Скопируйте его и вставьте в *Настройки → Telegram* на сайте.",
        "",
        "После этого вы будете получать уведомления о сработавших сигналах и стратегиях.",
      ].join("\n"),
      { parse_mode: "Markdown" },
    )
  })

  return _bot
}

export const POST = async (request: Request) => {
  const bot = getBot()
  if (!bot) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 })
  }

  const handler = webhookCallback(bot, "std/http")
  return handler(request)
}
