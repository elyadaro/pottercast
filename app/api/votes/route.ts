import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Maximum duration for serverless function (critical for high load)
export const maxDuration = 10

// GET - קבלת vote של משתמש
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // אם אין vote זה לא שגיאה, פשוט מחזירים null
      return NextResponse.json({ vote: null })
    }

    return NextResponse.json({ vote: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - יצירת vote חדש
export async function POST(request: NextRequest) {
  try {
    const { userId, predictions, clientTimestamp } = await request.json()

    if (!userId || !predictions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('votes')
      .insert({
        user_id: userId,
        predictions: predictions,
        client_timestamp: clientTimestamp || new Date().toISOString()
      })

    if (error) {
      console.error('Error creating vote:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - עדכון vote קיים
export async function PUT(request: NextRequest) {
  try {
    const { userId, predictions, clientTimestamp } = await request.json()

    if (!userId || !predictions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('votes')
      .update({
        predictions: predictions,
        client_timestamp: clientTimestamp || new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating vote:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
