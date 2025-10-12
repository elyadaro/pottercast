import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Candidates Endpoint with Edge Caching
 *
 * Purpose: Cache candidate list to reduce database load
 * Benefits for 300 concurrent users:
 * - Most requests served from Vercel Edge cache
 * - Reduces database connections
 * - Cache for 60 seconds (sufficient for one-time event)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, display_order, is_active')
      .eq('is_active', true)
      .order('display_order')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const response = NextResponse.json({ candidates: data })

    // Add caching headers for Vercel Edge
    // Cache for 60 seconds, revalidate in background
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=30'
    )

    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Note: Edge runtime removed due to incompatibility with force-static
// Caching is still enabled via Cache-Control headers
