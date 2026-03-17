import OpenAI from "openai"
import type { ChatCompletionTool } from "openai/resources/chat/completions"
import type { StrategyConfig, IndicatorType, ConditionType } from "@/core/types"
import type { AiProvider } from "./types"

const VALID_INDICATORS: IndicatorType[] = ["SMA", "EMA", "RSI", "MACD", "BOLLINGER", "PRICE"]
const VALID_CONDITIONS: ConditionType[] = [
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "BETWEEN",
]

const generateStrategyTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_strategy",
    description:
      "Create a trading strategy configuration with entry/exit conditions and risk management parameters",
    parameters: {
      type: "object",
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
}

const SYSTEM_PROMPT = `You are a trading strategy assistant for the AlgoBuilder platform.
Your task is to generate trading strategy configurations based on user requests.
Always use the create_strategy function to return the result.
If the user's request is vague, create a reasonable strategy based on common trading patterns.
Use appropriate indicator parameters (RSI period 14, SMA/EMA periods 12/26, MACD 12/26/9, Bollinger 20/2).
Always include risk management: stopLoss 2-5%, takeProfit 4-10%, maxPositionSize 5-20%, trailingStop 1-3%.
Respond in the language the user writes in.`

export class DeepSeekProvider implements AiProvider {
  private client: OpenAI

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    })
  }

  async generateStrategy(prompt: string): Promise<StrategyConfig> {
    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      tools: [generateStrategyTool],
      tool_choice: { type: "function", function: { name: "create_strategy" } },
      temperature: 0.3,
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.type !== "function") {
      throw new Error("AI не вернул стратегию. Попробуйте переформулировать запрос.")
    }

    const parsed = JSON.parse(toolCall.function.arguments) as StrategyConfig

    this.validateConfig(parsed)

    return parsed
  }

  private validateConfig(config: StrategyConfig): void {
    if (!VALID_INDICATORS.includes(config.entry.indicator)) {
      throw new Error(`Неизвестный индикатор: ${config.entry.indicator}`)
    }
    if (!VALID_INDICATORS.includes(config.exit.indicator)) {
      throw new Error(`Неизвестный индикатор: ${config.exit.indicator}`)
    }
    if (!VALID_CONDITIONS.includes(config.entry.condition)) {
      throw new Error(`Неизвестное условие: ${config.entry.condition}`)
    }
    if (!VALID_CONDITIONS.includes(config.exit.condition)) {
      throw new Error(`Неизвестное условие: ${config.exit.condition}`)
    }
  }
}
