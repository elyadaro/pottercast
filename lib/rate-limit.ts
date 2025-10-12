/**
 * Rate Limiter for Pottercast
 *
 * Purpose: Prevent abuse and protect against sudden spikes
 * Implementation: In-memory rate limiting using LRU cache
 *
 * Limits:
 * - 10 requests per minute per IP for voting endpoints
 * - 30 requests per minute per IP for read endpoints
 *
 * Note: This is a simple in-memory implementation.
 * For production with multiple instances, consider Redis or Upstash.
 */

type RateLimitStore = {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Rate limit a request based on identifier (usually IP address)
 *
 * @param identifier - Usually IP address or user ID
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns RateLimitResult with success status and metadata
 */
export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now()
  const key = `${identifier}`

  // Initialize or get existing record
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    }

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: store[key].resetTime,
    }
  }

  // Increment counter
  store[key].count++

  const remaining = Math.max(0, limit - store[key].count)
  const success = store[key].count <= limit

  return {
    success,
    limit,
    remaining,
    reset: store[key].resetTime,
  }
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  // Check various headers for real IP (Vercel, Cloudflare, etc.)
  const headers = new Headers(request.headers)

  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'יותר מדי בקשות. אנא נסה שוב בעוד מספר שניות.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}
