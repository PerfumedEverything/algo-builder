import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  PlaceOrderParams,
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
  getAvailableCash(accountId: string): Promise<number>
  placeOrder(params: PlaceOrderParams): Promise<string>
  cancelOrder(orderId: string, symbol: string): Promise<void>
  sandboxPayIn?(accountId: string, amount: number): Promise<void>
}
