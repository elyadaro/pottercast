import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, getClientIp, createRateLimitResponse } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const clientIp = getClientIp(request)

    // Different limits for different endpoints
    let limit = 30 // Default: 30 requests per minute
    let windowMs = 60 * 1000 // 1 minute

    // Stricter limits for write operations
    if (
      pathname.includes('/api/votes') ||
      pathname.includes('/api/auth/signup') ||
      pathname.includes('/api/auth/signin')
    ) {
      limit = 10 // 10 requests per minute for voting/auth
    }

    // Very strict for admin operations
    if (pathname.startsWith('/api/admin/')) {
      limit = 20 // 20 requests per minute for admin
    }

    const rateLimitResult = rateLimit(clientIp, limit, windowMs)

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
