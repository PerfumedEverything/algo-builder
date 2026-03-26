export const isMarketOpen = (now: Date = new Date()): boolean => {
  const mskOffsetMinutes = 180
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const mskMinutes = (utcMinutes + mskOffsetMinutes) % 1440

  const mskDate = new Date(now.getTime() + mskOffsetMinutes * 60 * 1000)
  const mskDay = mskDate.getUTCDay()

  if (mskDay === 0 || mskDay === 6) return false

  return mskMinutes >= 590 && mskMinutes < 1130
}
