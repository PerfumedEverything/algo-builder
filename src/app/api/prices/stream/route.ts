import Redis from "ioredis"
import { getCurrentUserId } from "@/server/actions/helpers"

export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<Response> {
  try {
    await getCurrentUserId()
  } catch {
    return new Response("Unauthorized", { status: 401 })
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
        controller.close()
      })
    },
    cancel() {
      subscriber.unsubscribe("price-updates")
      subscriber.disconnect()
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
