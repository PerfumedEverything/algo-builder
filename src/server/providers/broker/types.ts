import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  Portfolio,
} from "@/core/types"

export interface BrokerProvider {
  connect(token: string): Promise<void>
  disconnect(): Promise<void>
  getAccounts(): Promise<BrokerAccount[]>
  getPortfolio(accountId: string): Promise<Portfolio>
  getInstruments(type: string): Promise<BrokerInstrument[]>
  getCandles(params: CandleParams): Promise<Candle[]>
  getCurrentPrice(instrumentId: string): Promise<number>
  sandboxPayIn?(accountId: string, amount: number): Promise<void>
}
