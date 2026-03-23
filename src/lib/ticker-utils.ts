export const cleanTicker = (ticker: string): string => {
  return ticker.replace(/@$/, "")
}
