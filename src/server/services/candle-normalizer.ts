import { Candle } from "@/core/types/broker"

type NormalizerOptions = {
  includeEveningSession?: boolean
  filterWeekends?: boolean
}

export const MSK_OFFSET_MS = 3 * 60 * 60 * 1000

export const utcToMsk = (utcDate: Date): Date =>
  new Date(utcDate.getTime() + MSK_OFFSET_MS)

export const moexSessionStartUtcHour = (): number => 7

export const isInMoexSession = (utcDate: Date, opts: NormalizerOptions): boolean => {
  const mskDate = new Date(utcDate.getTime() + MSK_OFFSET_MS)
  const dayOfWeek = mskDate.getUTCDay()

  if (opts.filterWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) return false

  const minuteOfDay = mskDate.getUTCHours() * 60 + mskDate.getUTCMinutes()
  const inMain = minuteOfDay >= 600 && minuteOfDay < 1120
  const inEvening = minuteOfDay >= 1145 && minuteOfDay < 1430

  return inMain || (!!opts.includeEveningSession && inEvening)
}

export const normalizeMoexCandles = (candles: Candle[], opts?: NormalizerOptions): Candle[] => {
  const options: Required<NormalizerOptions> = {
    filterWeekends: true,
    includeEveningSession: false,
    ...opts,
  }
  return candles.filter((c) => isInMoexSession(c.time, options))
}
