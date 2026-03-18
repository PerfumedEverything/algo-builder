import { Bot } from "grammy"

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error("[Bot] TELEGRAM_BOT_TOKEN not set")
  process.exit(1)
}

const bot = new Bot(token)

bot.command("start", async (ctx) => {
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

bot.start({
  onStart: () => console.log("[Bot] @AculaTradeNot_bot started (polling)"),
})
