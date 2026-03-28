export const isMarketOpen = (now: Date = new Date()): boolean => {
  const mskOffsetMinutes = 180
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const mskMinutes = (utcMinutes + mskOffsetMinutes) % 1440

  const mskDate = new Date(now.getTime() + mskOffsetMinutes * 60 * 1000)
  const mskDay = mskDate.getUTCDay()

  if (mskDay === 0 || mskDay === 6) return false

  const inPreOpenAndMain = mskMinutes >= 590 && mskMinutes < 1120
  const inEvening = mskMinutes >= 1120 && mskMinutes < 1430
  return inPreOpenAndMain || inEvening
}
