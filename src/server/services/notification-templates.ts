import type { SignalRow } from "@/server/repositories/signal-repository"
import type { StrategyRow } from "@/server/repositories/strategy-repository"
import type { StrategyConfig } from "@/core/types"
import { IndicatorCalculator } from "./indicator-calculator"

type EvalContext = {
  price: number
  candles: { open: number; high: number; low: number; close: number; volume: number; time: Date }[]
}

export const formatSignalNotification = (signal: SignalRow, ctx: EvalContext): string => {
  const ticker = signal.instrument.toUpperCase()

  if (signal.conditions.length > 1) {
    return formatMultiCondition(ticker, signal, ctx)
  }

  const primaryIndicator = signal.conditions[0]?.indicator ?? "PRICE"
  const time = new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" })

  switch (primaryIndicator) {
    case "PRICE":
      return formatPriceLevel(ticker, signal, ctx)
    case "PRICE_CHANGE":
      return formatPriceChange(ticker, signal, ctx)
    case "VOLUME":
      return formatVolumeAnomaly(ticker, signal, ctx)
    case "SUPPORT":
    case "RESISTANCE":
      return formatLevelBreakout(ticker, signal, ctx, primaryIndicator)
    case "RSI":
    case "SMA":
    case "EMA":
    case "MACD":
    case "BOLLINGER":
      return formatIndicator(ticker, signal, ctx, primaryIndicator)
    default:
      return formatDefault(ticker, signal, ctx, time)
  }
}

const formatPriceLevel = (
  ticker: string,
  signal: SignalRow,
  ctx: EvalContext,
): string => {
  const target = signal.conditions[0]?.value ?? 0
  const diff = target > 0 ? (((ctx.price - target) / target) * 100).toFixed(1) : "0"
  const sign = ctx.price >= target ? "+" : ""

  return [
    `🔔 *ЦЕЛЕВОЙ УРОВЕНЬ | ${ticker}*`,
    `🎯 Цена: ${target}₽`,
    `📊 Текущая цена: ${ctx.price.toFixed(2)}₽ (${sign}${diff}%)`,
    `⏱️ Сработало: ${new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" })}`,
    "",
    `💡 Ваш алерт на пробой уровня сработал`,
  ].join("\n")
}

const formatPriceChange = (
  ticker: string,
  signal: SignalRow,
  ctx: EvalContext,
): string => {
  const period = signal.conditions[0]?.params?.period ?? 1
  const change = IndicatorCalculator.getPriceChange(ctx.candles, period)
  const direction = change >= 0 ? "РОСТ" : "ПАДЕНИЕ"
  const emoji = change >= 0 ? "🚀" : "📉"
  const arrow = change >= 0 ? "📈" : "📉"

  const prevPrice = ctx.candles.length > period
    ? ctx.candles[ctx.candles.length - 1 - period].close
    : ctx.price

  const avgVol = IndicatorCalculator.getAverageVolume(ctx.candles, 20)
  const curVol = ctx.candles[ctx.candles.length - 1]?.volume ?? 0
  const volRatio = avgVol > 0 ? ((curVol / avgVol) * 100).toFixed(0) : "—"

  return [
    `${emoji} *РЕЗКИЙ ${direction} | ${ticker}*`,
    `${arrow} ${change >= 0 ? "+" : ""}${change.toFixed(1)}% за ${period} бар`,
    `💰 ${prevPrice.toFixed(2)}₽ → ${ctx.price.toFixed(2)}₽`,
    `📊 Объем: ${volRatio}% от среднего`,
    "",
    `⚠️ Высокая волатильность`,
  ].join("\n")
}

const formatVolumeAnomaly = (
  ticker: string,
  signal: SignalRow,
  ctx: EvalContext,
): string => {
  const period = signal.conditions[0]?.params?.period ?? 20
  const avgVol = IndicatorCalculator.getAverageVolume(ctx.candles, period)
  const curVol = ctx.candles[ctx.candles.length - 1]?.volume ?? 0
  const multiplier = avgVol > 0 ? (curVol / avgVol).toFixed(1) : "—"
  const priceChange = IndicatorCalculator.getPriceChange(ctx.candles, 1)

  return [
    `📊 *АНОМАЛИЯ ОБЪЕМА | ${ticker}*`,
    `🔥 Объем: ${formatNumber(curVol)} (в ${multiplier}x выше среднего)`,
    `📈 Цена: ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(1)}%`,
    `🕐 ${new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" })}`,
    "",
    `🔍 Возможен вход крупного игрока`,
  ].join("\n")
}

const formatLevelBreakout = (
  ticker: string,
  signal: SignalRow,
  ctx: EvalContext,
  type: "SUPPORT" | "RESISTANCE",
): string => {
  const levels = IndicatorCalculator.detectLevels(
    ctx.candles,
    signal.conditions[0]?.params?.lookback ?? 50,
  )

  const isResistance = type === "RESISTANCE"
  const levelType = isResistance ? "Сопротивление пробито" : "Поддержка пробита"
  const nearestLevel = isResistance
    ? levels.resistances.filter((r) => r <= ctx.price).sort((a, b) => b - a)[0]
    : levels.supports.filter((s) => s >= ctx.price).sort((a, b) => a - b)[0]

  const level = nearestLevel ?? signal.conditions[0]?.value ?? 0
  const diff = level > 0 ? (((ctx.price - level) / level) * 100).toFixed(1) : "0"
  const hint = isResistance ? "Уровень стал поддержкой" : "Уровень стал сопротивлением"

  return [
    `⛓️ *ПРОБОЙ УРОВНЯ | ${ticker}*`,
    `📊 Тип: ${levelType}`,
    `🎯 Уровень: ${level.toFixed(2)}₽`,
    `📈 Цена сейчас: ${ctx.price.toFixed(2)}₽ (${ctx.price >= level ? "+" : ""}${diff}%)`,
    "",
    `💡 ${hint}`,
  ].join("\n")
}

const formatIndicator = (
  ticker: string,
  signal: SignalRow,
  ctx: EvalContext,
  indicator: string,
): string => {
  const params = signal.conditions[0]?.params ?? {}
  let indicatorValue = ""
  let interpretation = ""

  switch (indicator) {
    case "RSI": {
      const val = IndicatorCalculator.calculateRSI(ctx.candles, params.period ?? 14)
      indicatorValue = `RSI (${params.period ?? 14}): ${val.toFixed(1)}`
      if (val > 70) interpretation = "перекупленность"
      else if (val < 30) interpretation = "перепроданность"
      else interpretation = "нейтрально"
      break
    }
    case "SMA": {
      const val = IndicatorCalculator.calculateSMA(ctx.candles, params.period ?? 20)
      indicatorValue = `SMA (${params.period ?? 20}): ${val.toFixed(2)}`
      interpretation = ctx.price > val ? "цена выше SMA" : "цена ниже SMA"
      break
    }
    case "EMA": {
      const val = IndicatorCalculator.calculateEMA(ctx.candles, params.period ?? 20)
      indicatorValue = `EMA (${params.period ?? 20}): ${val.toFixed(2)}`
      interpretation = ctx.price > val ? "цена выше EMA" : "цена ниже EMA"
      break
    }
    case "MACD": {
      const val = IndicatorCalculator.calculateMACD(ctx.candles)
      indicatorValue = `MACD: ${val.macd.toFixed(2)} / Signal: ${val.signal.toFixed(2)}`
      interpretation = val.histogram > 0 ? "бычий импульс" : "медвежий импульс"
      break
    }
    case "BOLLINGER": {
      const val = IndicatorCalculator.calculateBollinger(ctx.candles, params.period ?? 20)
      indicatorValue = `BB (${params.period ?? 20}): ${val.lower.toFixed(2)} — ${val.upper.toFixed(2)}`
      if (ctx.price > val.upper) interpretation = "выше верхней полосы"
      else if (ctx.price < val.lower) interpretation = "ниже нижней полосы"
      else interpretation = "внутри канала"
      break
    }
  }

  const conditionTarget = signal.conditions[0]?.value ?? 0
  const conditionType = signal.conditions[0]?.condition ?? ""
  const conditionLabel = formatConditionLabel(conditionType, conditionTarget)

  const typeEmoji = signal.signalType === "BUY" ? "📗" : "📕"
  const typeLabel = signal.signalType === "BUY" ? "ПОКУПКА" : "ПРОДАЖА"

  return [
    `${typeEmoji} *${typeLabel} | ${ticker}*`,
    `📛 ${signal.name}`,
    `📊 ${indicatorValue} (${interpretation})`,
    `📈 Цена: ${ctx.price.toFixed(2)}₽`,
    conditionTarget ? `⚠️ ${conditionLabel}` : "",
    `🕐 ${new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" })}`,
  ].filter(Boolean).join("\n")
}

const formatMultiCondition = (
  ticker: string,
  signal: SignalRow,
  ctx: EvalContext,
): string => {
  const logic = signal.logicOperator ?? "AND"
  const typeLabel = signal.signalType === "BUY" ? "📗 Покупка" : "📕 Продажа"

  const conditionLines = signal.conditions.map((c) => {
    const val = getIndicatorDisplayValue(c, ctx)
    const label = formatConditionLabel(c.condition, c.value ?? 0)
    return `  ${c.indicator}: ${val} ${label} ✓`
  })

  return [
    `⚡ *${signal.name} | ${ticker}*`,
    typeLabel,
    `📈 Цена: ${ctx.price.toFixed(2)}₽`,
    "",
    `📋 Условия (${logic}):`,
    ...conditionLines,
    "",
    `🕐 ${new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" })}`,
  ].join("\n")
}

const getIndicatorDisplayValue = (
  c: { indicator: string; params: Record<string, number> },
  ctx: EvalContext,
): string => {
  const p = c.params ?? {}
  switch (c.indicator) {
    case "PRICE":
      return ctx.price.toFixed(2)
    case "RSI":
      return IndicatorCalculator.calculateRSI(ctx.candles, p.period ?? 14).toFixed(1)
    case "SMA":
      return IndicatorCalculator.calculateSMA(ctx.candles, p.period ?? 20).toFixed(2)
    case "EMA":
      return IndicatorCalculator.calculateEMA(ctx.candles, p.period ?? 20).toFixed(2)
    case "MACD": {
      const m = IndicatorCalculator.calculateMACD(ctx.candles)
      return `${m.macd.toFixed(2)}/${m.signal.toFixed(2)}`
    }
    case "BOLLINGER": {
      const bb = IndicatorCalculator.calculateBollinger(ctx.candles, p.period ?? 20)
      return `${bb.lower.toFixed(0)}-${bb.upper.toFixed(0)}`
    }
    case "VOLUME": {
      const avg = IndicatorCalculator.getAverageVolume(ctx.candles, p.period ?? 20)
      const cur = ctx.candles[ctx.candles.length - 1]?.volume ?? 0
      return avg > 0 ? `${(cur / avg).toFixed(1)}x` : "—"
    }
    case "PRICE_CHANGE":
      return `${IndicatorCalculator.getPriceChange(ctx.candles, p.period ?? 1).toFixed(1)}%`
    default:
      return "—"
  }
}

const formatDefault = (
  ticker: string,
  signal: SignalRow,
  ctx: EvalContext,
  time: string,
): string => {
  const typeLabel = signal.signalType === "BUY" ? "Покупка" : "Продажа"
  return [
    `🔔 *${signal.name}*`,
    `📊 ${ticker} — ${typeLabel}`,
    `💰 Цена: ${ctx.price.toFixed(2)}₽`,
    `📋 Все условия выполнены`,
    `🕐 ${time}`,
  ].join("\n")
}

const formatConditionLabel = (condition: string, value: number): string => {
  const labels: Record<string, string> = {
    GREATER_THAN: `> ${value}`,
    LESS_THAN: `< ${value}`,
    CROSSES_ABOVE: `пересекает вверх ${value}`,
    CROSSES_BELOW: `пересекает вниз ${value}`,
    ABOVE_BY_PERCENT: `выше на ${value}%`,
    BELOW_BY_PERCENT: `ниже на ${value}%`,
    MULTIPLIED_BY: `в ${value}x`,
    EQUALS: `= ${value}`,
  }
  return labels[condition] ?? `${condition} ${value}`
}

export const formatStrategyNotification = (
  strategy: StrategyRow,
  side: "entry" | "exit",
  ctx: EvalContext,
): string => {
  const ticker = strategy.instrument.toUpperCase()
  const config = strategy.config as StrategyConfig
  const conditions = side === "entry" ? config.entry : config.exit
  const logic = side === "entry" ? (config.entryLogic ?? "AND") : (config.exitLogic ?? "AND")
  const sideEmoji = side === "entry" ? "📗" : "📕"
  const sideLabel = side === "entry" ? "ВХОД (BUY)" : "ВЫХОД (SELL)"
  const time = new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow" })

  if (!conditions?.length) {
    return `🔔 *${strategy.name}* | ${ticker}\n${sideEmoji} ${sideLabel}\n💰 ${ctx.price.toFixed(2)}₽\n🕐 ${time}`
  }

  const conditionLines = conditions.map((c) => {
    const val = getIndicatorDisplayValue(c, ctx)
    const label = formatConditionLabel(c.condition, c.value ?? 0)
    return `  ${c.indicator}: ${val} ${label} ✓`
  })

  return [
    `🎯 *${strategy.name} | ${ticker}*`,
    `${sideEmoji} ${sideLabel}`,
    `📈 Цена: ${ctx.price.toFixed(2)}₽`,
    "",
    `📋 Условия (${logic}):`,
    ...conditionLines,
    "",
    `🕐 ${time}`,
  ].join("\n")
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}
