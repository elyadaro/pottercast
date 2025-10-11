import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET - קבלת כל התוצאות
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // בדיקת הרשאות admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('results')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ results: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - שמירת תוצאות (upsert)
export async function POST(request: NextRequest) {
  try {
    const { results } = await request.json()

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Invalid results format' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // בדיקת הרשאות admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // שמירת כל התוצאות
    for (const result of results) {
      const { error } = await supabase
        .from('results')
        .upsert({
          candidate_name: result.candidate_name,
          actual_score: result.actual_score,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'candidate_name'
        })

      if (error) {
        console.error(`Error saving result for ${result.candidate_name}:`, error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
