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

    // שליפת כל ההצבעות (ללא JOIN - מטעמי תאימות)
    // הסיבה: votes.user_id מצביע ל-auth.users, לא ל-public.users ישירות
    // PostgREST לא יכול לזהות את הקשר באופן אוטומטי
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('id, user_id, predictions, client_timestamp, server_timestamp, updated_at')
      .order('client_timestamp', { ascending: true })

    if (votesError) {
      console.error('Error loading votes:', votesError)
      return NextResponse.json({ error: votesError.message }, { status: 500 })
    }

    if (!votesData || votesData.length === 0) {
      return NextResponse.json({ votes: [] })
    }

    // שליפת כל פרופילי המשתמשים (public.users) בשאילתה אחת
    const userIds = votesData.map(v => v.user_id)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone')
      .in('id', userIds)

    if (usersError) {
      console.error('Error loading users:', usersError)
      // Continue without user data rather than failing completely
    }

    // יצירת מפה מהירה של משתמשים לפי ID
    const usersMap = new Map(
      (usersData || []).map(user => [user.id, user])
    )

    // איחוד הנתונים
    const votesWithUsers = votesData.map(vote => ({
      id: vote.id,
      user_id: vote.user_id,
      predictions: vote.predictions,
      client_timestamp: vote.client_timestamp,
      server_timestamp: vote.server_timestamp,
      updated_at: vote.updated_at,
      user: usersMap.get(vote.user_id) || null
    }))

    return NextResponse.json({ votes: votesWithUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
