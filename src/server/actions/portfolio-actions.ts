"use server"

import OpenAI from "openai"
import type { ApiResponse } from "@/core/types"
import type { PositionOperation } from "@/core/types"
import { getEnv } from "@/core/config/env"
import { getCurrentUserId } from "./helpers"

const ANALYSIS_PROMPT = `Ты профессиональный бухгалтер и финансовый аналитик.
Проанализируй историю операций по инструменту и рассчитай по методу FIFO:
1. Какие лоты остались в портфеле (дата покупки, цена, количество)
2. Какие лоты были закрыты (дата покупки → дата продажи, P&L)
3. Средневзвешенная цена оставшихся лотов
4. Оценка оставшихся лотов по текущему курсу
5. Итого: общий P&L реализованный + нереализованный

Формат ответа — чёткая таблица в markdown. Используй русский язык. Будь точен в расчётах.`

export const analyzeLotAction = async (
  ticker: string,
  operations: PositionOperation[],
  currentPrice: number,
): Promise<ApiResponse<string>> => {
  try {
    await getCurrentUserId()

    const env = getEnv()
    if (!env.DEEPSEEK_API_KEY) {
      return { success: false, error: "AI провайдер не настроен" }
    }

    const client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: env.DEEPSEEK_BASE_URL,
    })

    const opsText = operations
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((op) => `${op.date} | ${op.type} | ${op.quantity} шт. | ${op.price} ₽ | сумма ${op.amount} ₽`)
      .join("\n")

    const userMessage = `Инструмент: ${ticker}
Текущая цена: ${currentPrice} ₽

История операций:
Дата | Тип | Количество | Цена | Сумма
${opsText}`

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: "AI не вернул ответ" }
    }

    return { success: true, data: content }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
