import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET - קבלת כל ההצבעות עם פרטי משתמשים
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

    // שליפת כל ההצבעות עם פרטי משתמשים בשאילתה אחת (JOIN)
    // Payload optimization: Only select needed fields
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select(`
        user_id,
        predictions,
        client_timestamp,
        server_timestamp,
        updated_at,
        users!inner(first_name, last_name, phone)
      `)
      .order('client_timestamp', { ascending: true })

    if (votesError) {
      console.error('Error loading votes:', votesError)
      return NextResponse.json({ error: votesError.message }, { status: 500 })
    }

    if (!votesData) {
      return NextResponse.json({ votes: [] })
    }

    // Transform data to match expected format
    const votesWithUsers = votesData.map(vote => ({
      user_id: vote.user_id,
      predictions: vote.predictions,
      client_timestamp: vote.client_timestamp,
      server_timestamp: vote.server_timestamp,
      updated_at: vote.updated_at,
      user: vote.users
    }))

    return NextResponse.json({ votes: votesWithUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
