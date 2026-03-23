import OpenAI from "openai"
import type { ChatCompletionTool, ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { AiGeneratedStrategy, IndicatorType, ConditionType } from "@/core/types"
import type { AiProvider, AiChatMessage, AiChatResponse } from "./types"

const VALID_INDICATORS: IndicatorType[] = ["SMA", "EMA", "RSI", "MACD", "BOLLINGER", "PRICE", "VOLUME", "PRICE_CHANGE", "SUPPORT", "RESISTANCE"]
const VALID_CONDITIONS: ConditionType[] = [
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "BETWEEN",
  "ABOVE_BY_PERCENT",
  "BELOW_BY_PERCENT",
  "MULTIPLIED_BY",
]

const VALID_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"]

const generateStrategyTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_strategy",
    description:
      "Create a complete trading strategy with name, instrument, conditions and risk management",
    parameters: {
      type: "object",
      required: ["name", "instrument", "instrumentType", "timeframe", "description", "config"],
      properties: {
        name: {
          type: "string",
          description: "Short strategy name in Russian (e.g. 'RSI стратегия на Сбер')",
        },
        instrument: {
          type: "string",
          description: "Ticker symbol (e.g. 'sber', 'gazp', 'lkoh', 'yndx', 'btcusd')",
        },
        instrumentType: {
          type: "string",
          enum: ["STOCK", "BOND", "CURRENCY", "FUTURES"],
          description: "Type of instrument",
        },
        timeframe: {
          type: "string",
          enum: VALID_TIMEFRAMES,
          description: "Trading timeframe",
        },
        description: {
          type: "string",
          description: "Brief strategy description in Russian (1-2 sentences)",
        },
        config: {
          type: "object",
          description: "Strategy configuration with entry, exit conditions and risk management",
          required: ["entry", "exit", "risks"],
          properties: {
        entry: {
          type: "object",
          description: "Entry condition — when to open a position",
          required: ["indicator", "params", "condition"],
          properties: {
            indicator: {
              type: "string",
              enum: VALID_INDICATORS,
              description: "Technical indicator",
            },
            params: {
              type: "object",
              description:
                "Indicator parameters. RSI: {period}. SMA/EMA: {period}. MACD: {fastPeriod, slowPeriod, signalPeriod}. BOLLINGER: {period, stdDev}. PRICE: {}",
              additionalProperties: { type: "number" },
            },
            condition: {
              type: "string",
              enum: VALID_CONDITIONS,
              description: "Comparison condition",
            },
            value: {
              type: "number",
              description: "Threshold value (e.g. RSI 30, price 100)",
            },
          },
        },
        exit: {
          type: "object",
          description: "Exit condition — when to close a position",
          required: ["indicator", "params", "condition"],
          properties: {
            indicator: {
              type: "string",
              enum: VALID_INDICATORS,
            },
            params: {
              type: "object",
              additionalProperties: { type: "number" },
            },
            condition: {
              type: "string",
              enum: VALID_CONDITIONS,
            },
            value: { type: "number" },
          },
        },
        risks: {
          type: "object",
          description: "Risk management parameters (all values in percentages)",
          properties: {
            stopLoss: {
              type: "number",
              description: "Stop loss percentage (e.g. 3 = 3%)",
            },
            takeProfit: {
              type: "number",
              description: "Take profit percentage (e.g. 6 = 6%)",
            },
            maxPositionSize: {
              type: "number",
              description: "Max position size as % of portfolio (e.g. 10 = 10%)",
            },
            trailingStop: {
              type: "number",
              description: "Trailing stop percentage (e.g. 1.5 = 1.5%)",
            },
          },
        },
          },
        },
      },
    },
  },
}

const INDICATOR_HINTS = [
  "Используй RSI с нестандартным периодом (7, 9, 21) вместо дефолтного 14",
  "Попробуй комбинацию MACD + Bollinger Bands для фильтрации сигналов",
  "Используй пересечение двух SMA (быстрая 9, медленная 21) как entry",
  "Примени EMA crossover (12/26) с подтверждением RSI",
  "Используй прорыв Bollinger Bands с подтверждением объёмом",
  "Попробуй стратегию на базе уровней поддержки/сопротивления",
  "Используй RSI divergence — расхождение RSI и цены",
  "Примени MACD histogram crossover с EMA фильтром",
  "Используй стратегию mean reversion — возврат к SMA после отклонения",
  "Попробуй momentum стратегию на PRICE_CHANGE с RSI фильтром",
  "Используй Volume spike + Price breakout комбинацию",
  "Примени двойное дно/вершину через Support/Resistance индикаторы",
]

const RISK_PROFILES = [
  "Консервативный: SL 1-2%, TP 3-5%, позиция 5-10%",
  "Умеренный: SL 3-4%, TP 6-8%, позиция 10-15%",
  "Агрессивный: SL 5-8%, TP 10-20%, позиция 15-25%",
  "Скальпинг: SL 0.3-1%, TP 0.5-2%, позиция 20-30%",
  "Свинг: SL 3-5%, TP 8-15%, позиция 10-20%, trailing 2-3%",
]

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const SYSTEM_PROMPT = `You are a trading strategy assistant for the AculaTrade platform.
Your task is to generate complete trading strategy configurations based on user requests.
Always use the create_strategy function to return the result.
Generate a descriptive Russian name and description for each strategy.
Extract the instrument ticker from the user's request (e.g. "Сбер" → "sber", "Газпром" → "gazp", "Лукойл" → "lkoh", "Яндекс" → "yndx").
Choose the appropriate instrumentType and timeframe based on context.
If the user's request is vague, create a CREATIVE and UNIQUE strategy — avoid repeating standard RSI 30/70 patterns.
Vary indicator parameters: RSI period 7-21, SMA/EMA periods 5-50, MACD fast 8-16/slow 21-30/signal 5-12, Bollinger period 10-30 stdDev 1.5-2.5.
Always include risk management with varied values based on strategy style.
For scalping strategies use short timeframes (1m, 5m). For swing trading use longer (1d, 1w).
Default timeframe is 1d if not specified.
Respond in Russian for name and description fields.
Be creative — each strategy should be unique even for similar requests.`

const CHAT_SYSTEM_PROMPT = `Ты — AI-помощник AculaTrade для создания торговых стратегий.

Твоя задача — помочь пользователю создать стратегию через диалог.
Пользователь может быть новичком в трейдинге — объясняй просто.

Порядок:
1. Спроси какой инструмент интересует (акция, валюта, конкретный тикер — Сбер, Газпром и т.д.)
2. Спроси стиль торговли: скальпинг (минуты), свинг (дни-недели), долгосрок (месяцы)
3. Спроси про допустимый риск: консервативный (SL 2%), умеренный (SL 3-5%), агрессивный (SL 5-10%)
4. Когда собрал достаточно информации — вызови функцию create_strategy

Правила:
- Отвечай коротко, 2-3 предложения максимум
- Задавай по одному вопросу за раз
- Если пользователь сразу описал конкретную стратегию с деталями — сразу генерируй через create_strategy
- Используй русский язык
- Будь дружелюбным и профессиональным
- Не используй технический жаргон без объяснения
- Тикеры: "Сбер" → "sber", "Газпром" → "gazp", "Лукойл" → "lkoh", "Яндекс" → "yndx", "ВТБ" → "vtbr"
- Риск-менеджмент подбирай по стилю: консервативный (SL 2%, TP 4%), умеренный (SL 3%, TP 6%), агрессивный (SL 5%, TP 10%)`

export class DeepSeekProvider implements AiProvider {
  private client: OpenAI

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    })
  }

  async generateStrategy(prompt: string): Promise<AiGeneratedStrategy> {
    const hint = randomItem(INDICATOR_HINTS)
    const risk = randomItem(RISK_PROFILES)
    const seed = `\nCreativity hint: ${hint}\nRisk profile: ${risk}`

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + seed },
        { role: "user", content: prompt },
      ],
      tools: [generateStrategyTool],
      tool_choice: { type: "function", function: { name: "create_strategy" } },
      temperature: 0.8,
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.type !== "function") {
      throw new Error("AI не вернул стратегию. Попробуйте переформулировать запрос.")
    }

    const parsed = JSON.parse(toolCall.function.arguments) as AiGeneratedStrategy

    this.validateConfig(parsed)

    return parsed
  }

  async chatAboutStrategy(messages: AiChatMessage[]): Promise<AiChatResponse> {
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ]

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: apiMessages,
      tools: [generateStrategyTool],
      temperature: 0.7,
    })

    const choice = response.choices[0]?.message
    if (!choice) {
      throw new Error("AI не ответил")
    }

    const toolCall = choice.tool_calls?.[0]
    if (toolCall && toolCall.type === "function" && toolCall.function.name === "create_strategy") {
      const parsed = JSON.parse(toolCall.function.arguments) as AiGeneratedStrategy
      this.validateConfig(parsed)

      const textContent = choice.content || "Готово! Вот ваша стратегия:"

      return {
        message: textContent,
        strategy: parsed,
      }
    }

    return {
      message: choice.content || "Не удалось получить ответ",
    }
  }

  private validateConfig(strategy: AiGeneratedStrategy): void {
    const { config } = strategy
    if (!config) {
      const raw = strategy as Record<string, unknown>
      if (raw.entry && raw.exit && raw.risks) {
        const entry = Array.isArray(raw.entry) ? raw.entry : [raw.entry]
        const exit = Array.isArray(raw.exit) ? raw.exit : [raw.exit]
        ;(strategy as Record<string, unknown>).config = {
          entry,
          exit,
          entryLogic: "AND",
          exitLogic: "AND",
          risks: raw.risks,
        }
        delete (strategy as Record<string, unknown>).entry
        delete (strategy as Record<string, unknown>).exit
        delete (strategy as Record<string, unknown>).risks
      } else {
        throw new Error("AI вернул некорректную структуру стратегии")
      }
    }

    const cfg = strategy.config
    if (!Array.isArray(cfg.entry)) {
      cfg.entry = [cfg.entry]
    }
    if (!Array.isArray(cfg.exit)) {
      cfg.exit = [cfg.exit]
    }
    if (!cfg.entryLogic) cfg.entryLogic = "AND"
    if (!cfg.exitLogic) cfg.exitLogic = "AND"

    for (const c of cfg.entry) {
      if (!VALID_INDICATORS.includes(c.indicator)) {
        throw new Error(`Неизвестный индикатор: ${c.indicator}`)
      }
      if (!VALID_CONDITIONS.includes(c.condition)) {
        throw new Error(`Неизвестное условие: ${c.condition}`)
      }
    }
    for (const c of cfg.exit) {
      if (!VALID_INDICATORS.includes(c.indicator)) {
        throw new Error(`Неизвестный индикатор: ${c.indicator}`)
      }
      if (!VALID_CONDITIONS.includes(c.condition)) {
        throw new Error(`Неизвестное условие: ${c.condition}`)
      }
    }
    if (!VALID_TIMEFRAMES.includes(strategy.timeframe)) {
      strategy.timeframe = "1d"
    }
  }
}
