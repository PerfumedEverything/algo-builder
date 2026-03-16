import type { AiProvider } from "./types"
import { MockAiProvider } from "./mock-ai-provider"

export type { AiProvider }
export { MockAiProvider }

export const getAiProvider = (): AiProvider => {
  return new MockAiProvider()
}
