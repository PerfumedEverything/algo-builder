import type { BrokerProvider } from "./types"
import { MockBrokerProvider } from "./mock-broker-provider"
import { TinkoffProvider } from "./tinkoff-provider"
import { BybitProvider } from "./bybit-provider"
import { BrokerRepository } from "@/server/repositories/broker-repository"

export type { BrokerProvider }
export { MockBrokerProvider }
export { TinkoffProvider }
export { BybitProvider }

export const getBrokerProvider = async (userId: string): Promise<BrokerProvider> => {
  const repo = new BrokerRepository()
  const brokerType = await repo.getBrokerType(userId)

  if (brokerType === "BYBIT") {
    return new BybitProvider()
  }

  return new TinkoffProvider()
}
