import type {
  BrokerAccount,
  BrokerInstrument,
  Candle,
  CandleParams,
  Portfolio,
} from "@/core/types"
import type { BrokerProvider } from "./types"

export class TinkoffProvider implements BrokerProvider {
  async connect(_token: string): Promise<void> {
    throw new Error("TinkoffProvider: requires TINKOFF_INVEST_TOKEN")
  }

  async disconnect(): Promise<void> {
    throw new Error("TinkoffProvider: not implemented")
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    throw new Error("TinkoffProvider: not implemented")
  }

  async getPortfolio(_accountId: string): Promise<Portfolio> {
    throw new Error("TinkoffProvider: not implemented")
  }

  async getInstruments(_type: string): Promise<BrokerInstrument[]> {
    throw new Error("TinkoffProvider: not implemented")
  }

  async getCandles(_params: CandleParams): Promise<Candle[]> {
    throw new Error("TinkoffProvider: not implemented")
  }

  async getCurrentPrice(_instrumentId: string): Promise<number> {
    throw new Error("TinkoffProvider: not implemented")
  }
}
