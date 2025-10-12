import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { logVoteSubmission, logError, startTimer } from '@/lib/logger'

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
  const timer = startTimer()

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
      logError('Error creating vote', error, { userId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log successful vote submission
    logVoteSubmission(userId, false)

    const duration = timer.elapsed()
    return NextResponse.json({ success: true, duration })
  } catch (error: any) {
    logError('Unexpected error in POST /api/votes', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - עדכון vote קיים
export async function PUT(request: NextRequest) {
  const timer = startTimer()

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
      logError('Error updating vote', error, { userId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log successful vote edit
    logVoteSubmission(userId, true)

    const duration = timer.elapsed()
    return NextResponse.json({ success: true, duration })
  } catch (error: any) {
    logError('Unexpected error in PUT /api/votes', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
