import Redis from "ioredis"
import { getCurrentUserId } from "@/server/actions/helpers"
import { trackConnection } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<Response> {
  let userId: string
  try {
    userId = await getCurrentUserId()
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  const { allowed, release } = await trackConnection(userId, "price-stream", 3)
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many connections" }), { status: 429 })
  }

  const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  await subscriber.connect()

  const stream = new ReadableStream({
    start(controller) {
      subscriber.subscribe("price-updates")

      subscriber.on("message", (_channel: string, message: string) => {
        controller.enqueue(`data: ${message}\n\n`)
      })

      request.signal.addEventListener("abort", () => {
        subscriber.unsubscribe("price-updates")
        subscriber.disconnect()
        release()
        controller.close()
      })
    },
    cancel() {
      subscriber.unsubscribe("price-updates")
      subscriber.disconnect()
      release()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
