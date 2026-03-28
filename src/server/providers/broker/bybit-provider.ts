import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  PlaceOrderParams,
  Portfolio,
} from "@/core/types"
import type { BrokerProvider } from "./types"

export class BybitProvider implements BrokerProvider {
  async connect(_token: string): Promise<void> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async disconnect(): Promise<void> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async getPortfolio(_accountId: string): Promise<Portfolio> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async getInstruments(_type: string): Promise<BrokerInstrument[]> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async getCandles(_params: CandleParams): Promise<Candle[]> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async getCurrentPrice(_instrumentId: string): Promise<number> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async getAvailableCash(_accountId: string): Promise<number> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async placeOrder(_params: PlaceOrderParams): Promise<string> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }

  async cancelOrder(_orderId: string, _symbol: string): Promise<void> {
    throw new Error("BybitProvider not implemented — Plan 04")
  }
}
