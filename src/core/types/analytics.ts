export type MOEXCandle = {
  open: number
  close: number
  high: number
  low: number
  value: number
  volume: number
  begin: string
  end: string
}

export type DividendData = {
  secid: string
  isin: string
  registryclosedate: string
  value: number
  currencyid: string
}
