import type { ChatCompletionTool } from "openai/resources/chat/completions"
import type { IndicatorType, ConditionType } from "@/core/types"

export const generateGridStrategyTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_grid_strategy",
    description: "Create a Grid Trading strategy with price range, grid levels and risk management",
    parameters: {
      type: "object",
      required: ["name", "instrument", "instrumentType", "description", "config"],
      properties: {
        name: {
          type: "string",
          description: "Short strategy name in Russian (e.g. 'Grid на Сбер ±3%')",
        },
        instrument: {
          type: "string",
          description: "Ticker symbol (e.g. 'sber', 'BTCUSDT')",
        },
        instrumentType: {
          type: "string",
          enum: ["STOCK", "BOND", "CURRENCY", "FUTURES", "CRYPTO"],
          description: "Type of instrument",
        },
        description: {
          type: "string",
          description: "Brief strategy description in Russian",
        },
        config: {
          type: "object",
          required: ["type", "lowerPrice", "upperPrice", "gridLevels", "amountPerOrder", "gridDistribution", "feeRate"],
          properties: {
            type: { type: "string", enum: ["GRID"], description: "Always GRID" },
            lowerPrice: { type: "number", description: "Lower price boundary" },
            upperPrice: { type: "number", description: "Upper price boundary" },
            gridLevels: { type: "integer", description: "Number of grid levels (5-30)", minimum: 5, maximum: 30 },
            amountPerOrder: { type: "number", description: "Amount per order in currency" },
            gridDistribution: { type: "string", enum: ["ARITHMETIC", "GEOMETRIC"] },
            stopLoss: { type: "number", description: "Stop loss % below lower price (optional)" },
            takeProfit: { type: "number", description: "Take profit % above upper price (optional)" },
            feeRate: { type: "number", description: "Broker fee rate (e.g. 0.001 = 0.1%)" },
          },
        },
      },
    },
  },
}

export const VALID_INDICATORS: IndicatorType[] = [
  "SMA", "EMA", "RSI", "MACD", "BOLLINGER", "PRICE", "VOLUME", "PRICE_CHANGE", "SUPPORT", "RESISTANCE",
  "ATR", "STOCHASTIC", "VWAP", "WILLIAMS_R",
]

export const VALID_CONDITIONS: ConditionType[] = [
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

export const VALID_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"]

export const generateStrategyTool: ChatCompletionTool = {
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
                    "Indicator parameters. RSI: {period}. SMA/EMA: {period}. MACD: {fast, slow, signal}. BOLLINGER: {period, stdDev}. STOCHASTIC: {period, signalPeriod}. ATR: {period}. WILLIAMS_R: {period}. PRICE: {}",
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
                valueTo: {
                  type: "number" as const,
                  description: "Upper bound for BETWEEN condition",
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
                valueTo: {
                  type: "number" as const,
                  description: "Upper bound for BETWEEN condition",
                },
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

