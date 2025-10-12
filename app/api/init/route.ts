import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Optimized Init Endpoint
 *
 * Purpose: Reduce API calls from 3 (user + candidates + vote) to 1
 * Benefits for 300 concurrent users:
 * - Reduces total requests from 900 to 300
 * - Reduces database connections
 * - Faster initial page load
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Parallel queries for better performance
    const [
      { data: { user }, error: userError },
      { data: candidates, error: candidatesError }
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('candidates')
        .select('id, name, display_order, is_active')
        .eq('is_active', true)
        .order('display_order')
    ])

    // If there's an error with candidates (critical), return error
    if (candidatesError) {
      return NextResponse.json(
        { error: candidatesError.message },
        { status: 500 }
      )
    }

    // If user is logged in, try to fetch their existing vote
    // Only select fields needed by the client for payload optimization
    let vote = null
    if (user && !userError) {
      const { data: voteData } = await supabase
        .from('votes')
        .select('user_id, predictions, client_timestamp, server_timestamp, updated_at')
        .eq('user_id', user.id)
        .single()

      vote = voteData
    }

    const response = NextResponse.json({
      user: user || null,
      candidates: candidates || [],
      vote: vote
    })

    // Add caching for candidates data (user-specific data won't be cached)
    // Cache for 30 seconds for logged-out users
    if (!user) {
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=30, stale-while-revalidate=15'
      )
    }

    return response
  } catch (error: any) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Init API error:', error)
    }
    return NextResponse.json(
      { error: error.message || 'Failed to load initial data' },
      { status: 500 }
    )
  }
}
