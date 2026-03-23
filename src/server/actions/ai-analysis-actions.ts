"use server"

import OpenAI from "openai"

import type { ApiResponse } from "@/core/types"
import type { AiAnalysisBlock } from "@/core/config/ai-prompts"
import { AI_PROMPTS } from "@/core/config/ai-prompts"
import { getEnv } from "@/core/config/env"
import { getCurrentUserId } from "./helpers"

export const analyzeWithAiAction = async (
  block: AiAnalysisBlock,
  userMessage: string,
): Promise<ApiResponse<string>> => {
  try {
    await getCurrentUserId()

    if (userMessage.length > 50_000) {
      return { success: false, error: "Сообщение слишком длинное (макс. 50 000 символов)" }
    }

    const env = getEnv()
    if (!env.DEEPSEEK_API_KEY) {
      return { success: false, error: "AI провайдер не настроен" }
    }

    const client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: env.DEEPSEEK_BASE_URL,
    })

    const systemPrompt = AI_PROMPTS[block]

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
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
    return { success: false, error: "Ошибка AI анализа" }
  }
}
