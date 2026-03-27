import { createClient } from "@/lib/supabase/server"
import { getAiProvider } from "@/server/providers/ai"
import { AiContextService } from "@/server/services/ai-context-service"
import { checkRateLimit } from "@/lib/rate-limit"
import type { AiChatMessage } from "@/server/providers/ai/types"

export const dynamic = "force-dynamic"

type ChatRequestBody = {
  messages: AiChatMessage[]
  context?: { ticker?: string; timeframe?: string; figi?: string }
  forceCreate?: boolean
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { data: userData } = await supabase
      .from("User")
      .select("id")
      .eq("supabaseId", authData.user.id)
      .single()

    if (!userData) {
      return new Response("Unauthorized", { status: 401 })
    }

    const userId = userData.id

    const { allowed } = await checkRateLimit(userId, "ai-chat", 10, 60)
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
    }

    const body = (await request.json()) as ChatRequestBody
    const { messages, context, forceCreate } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), { status: 400 })
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages" }), { status: 413 })
    }

    const totalChars = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)
    if (totalChars > 50000) {
      return new Response(JSON.stringify({ error: "Content too large" }), { status: 413 })
    }

    const safeMessages = messages.filter((m) => m.role === "user" || m.role === "assistant")

    let enrichedMessages: AiChatMessage[] = safeMessages

    if (context?.ticker) {
      const contextText = await AiContextService.assembleContext({
        ticker: context.ticker,
        timeframe: context.timeframe ?? "1d",
        userId,
        figi: context.figi,
      })

      if (contextText) {
        enrichedMessages = [
          { role: "user", content: `[Контекст рынка]\n${contextText}` },
          ...safeMessages,
        ]
      }
    }

    const provider = getAiProvider()

    if (!provider.chatWithThinking) {
      return new Response(JSON.stringify({ error: "Streaming not supported" }), { status: 501 })
    }

    const generator = provider.chatWithThinking(enrichedMessages, forceCreate)

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error"
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", content: message })}\n\n`),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
