import type { AiGeneratedStrategy } from "@/core/types"
import type { AiProvider, AiChatMessage, AiChatResponse } from "./types"

const MOCK_STRATEGY: AiGeneratedStrategy = {
  name: "RSI стратегия на Сбер",
  instrument: "sber",
  instrumentType: "STOCK",
  timeframe: "1d",
  description: "Покупка при перепроданности RSI, продажа при перекупленности",
  config: {
    entry: [
      {
        indicator: "RSI",
        params: { period: 14 },
        condition: "LESS_THAN",
        value: 30,
      },
    ],
    exit: [
      {
        indicator: "RSI",
        params: { period: 14 },
        condition: "GREATER_THAN",
        value: 70,
      },
    ],
    entryLogic: "AND",
    exitLogic: "AND",
    risks: {
      stopLoss: 3,
      takeProfit: 6,
      maxPositionSize: 10,
      trailingStop: 1.5,
    },
  },
}

const MOCK_RESPONSES = [
  "Отлично! Какой инструмент вас интересует? Например, акции Сбера, Газпрома или что-то другое?",
  "Хороший выбор! Какой стиль торговли предпочитаете?\n• Скальпинг (сделки на минутах)\n• Свинг (дни-недели)\n• Долгосрок (месяцы)",
  "Понял! Какой уровень риска для вас комфортен?\n• Консервативный (стоп-лосс 2%)\n• Умеренный (стоп-лосс 3-5%)\n• Агрессивный (стоп-лосс 5-10%)",
]

export class MockAiProvider implements AiProvider {
  async generateStrategy(_prompt: string): Promise<AiGeneratedStrategy> {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return MOCK_STRATEGY
  }

  async chatAboutStrategy(messages: AiChatMessage[]): Promise<AiChatResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const userMessages = messages.filter((m) => m.role === "user")
    const step = userMessages.length

    if (step >= 3) {
      return {
        message: "Готово! Вот ваша стратегия:",
        strategy: MOCK_STRATEGY,
      }
    }

    return {
      message: MOCK_RESPONSES[step] ?? MOCK_RESPONSES[0],
    }
  }
}
