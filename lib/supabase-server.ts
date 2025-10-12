import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  // Use Supabase Pooler URL for better connection management
  // This prevents connection exhaustion under high load (300 concurrent users)
  const supabaseUrl = process.env.SUPABASE_POOLER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!

  return createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component, ignore
          }
        },
      },
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )
}
