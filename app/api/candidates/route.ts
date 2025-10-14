import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Enable ISR with 60 second revalidation
export const revalidate = 60

// Maximum duration for serverless function
export const maxDuration = 10

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

    // Add aggressive CDN caching headers
    return NextResponse.json(
      { candidates: data },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
