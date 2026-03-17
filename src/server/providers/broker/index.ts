import type { BrokerProvider } from "./types"
import { MockBrokerProvider } from "./mock-broker-provider"
import { TinkoffProvider } from "./tinkoff-provider"

export type { BrokerProvider }
export { MockBrokerProvider }
export { TinkoffProvider }

export const getBrokerProvider = (): BrokerProvider => {
  return new TinkoffProvider()
}
