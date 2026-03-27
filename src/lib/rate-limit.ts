import { redis } from "@/lib/redis"

export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate:${action}:${userId}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, windowSeconds)
  }
  return { allowed: count <= maxRequests, remaining: Math.max(0, maxRequests - count) }
}

export async function trackConnection(
  userId: string,
  action: string,
  maxConcurrent: number,
): Promise<{ allowed: boolean; release: () => Promise<void> }> {
  const key = `conn:${action}:${userId}`
  const count = await redis.incr(key)
  await redis.expire(key, 300)
  if (count > maxConcurrent) {
    await redis.decr(key)
    return { allowed: false, release: async () => {} }
  }
  return {
    allowed: true,
    release: async () => {
      await redis.decr(key)
    },
  }
}

export async function releaseConnection(userId: string, action: string): Promise<void> {
  const key = `conn:${action}:${userId}`
  const current = await redis.get(key)
  if (current !== null && parseInt(current) > 0) {
    await redis.decr(key)
  }
}
