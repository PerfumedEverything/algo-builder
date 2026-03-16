import type { BrokerProvider } from "./types"
import { MockBrokerProvider } from "./mock-broker-provider"

export type { BrokerProvider }
export { MockBrokerProvider }
export { TinkoffProvider } from "./tinkoff-provider"

export const getBrokerProvider = (): BrokerProvider => {
  return new MockBrokerProvider()
}
