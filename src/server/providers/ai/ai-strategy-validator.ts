import type { AiGeneratedStrategy } from "@/core/types"
import { VALID_INDICATORS, VALID_CONDITIONS, VALID_TIMEFRAMES } from "./ai-tools"

export const validateStrategyConfig = (strategy: AiGeneratedStrategy): void => {
  const { config } = strategy
  if (!config) {
    const raw = strategy as Record<string, unknown>
    if (raw.entry && raw.exit && raw.risks) {
      const entry = Array.isArray(raw.entry) ? raw.entry : [raw.entry]
      const exit = Array.isArray(raw.exit) ? raw.exit : [raw.exit]
      ;(strategy as Record<string, unknown>).config = {
        entry, exit, entryLogic: "AND", exitLogic: "AND", risks: raw.risks,
      }
      delete (strategy as Record<string, unknown>).entry
      delete (strategy as Record<string, unknown>).exit
      delete (strategy as Record<string, unknown>).risks
    } else {
      throw new Error("AI вернул некорректную структуру стратегии")
    }
  }

  const cfg = strategy.config
  if (!Array.isArray(cfg.entry)) cfg.entry = [cfg.entry]
  if (!Array.isArray(cfg.exit)) cfg.exit = [cfg.exit]
  if (!cfg.entryLogic) cfg.entryLogic = "AND"
  if (!cfg.exitLogic) cfg.exitLogic = "AND"

  for (const c of [...cfg.entry, ...cfg.exit]) {
    if (!VALID_INDICATORS.includes(c.indicator)) throw new Error(`Неизвестный индикатор: ${c.indicator}`)
    if (!VALID_CONDITIONS.includes(c.condition)) throw new Error(`Неизвестное условие: ${c.condition}`)
  }
  if (!VALID_TIMEFRAMES.includes(strategy.timeframe)) strategy.timeframe = "1d"
}
