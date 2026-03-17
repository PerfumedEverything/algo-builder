import type { AiProvider } from "./types"
import { MockAiProvider } from "./mock-ai-provider"
import { DeepSeekProvider } from "./deepseek-provider"
import { getEnv } from "@/core/config/env"

export type { AiProvider }
export { MockAiProvider }
export { DeepSeekProvider }

export const getAiProvider = (): AiProvider => {
  const env = getEnv()

  if (env.AI_PROVIDER === "deepseek" && env.DEEPSEEK_API_KEY) {
    return new DeepSeekProvider(env.DEEPSEEK_API_KEY, env.DEEPSEEK_BASE_URL)
  }

  return new MockAiProvider()
}
