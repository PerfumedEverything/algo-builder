import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  AI_PROVIDER: z.enum(["claude", "deepseek"]).default("claude"),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),

  TINKOFF_INVEST_TOKEN: z.string().optional(),
  TINKOFF_SANDBOX: z.string().default("true"),

  TELEGRAM_BOT_TOKEN: z.string().optional(),

  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export const getEnv = (): Env => {
  if (_env) return _env

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors)
    throw new Error("Invalid environment variables")
  }

  _env = result.data
  return _env
}
