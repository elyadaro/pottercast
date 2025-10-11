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

    // שליפת כל ההצבעות
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .order('client_timestamp', { ascending: true })

    if (votesError) {
      console.error('Error loading votes:', votesError)
      return NextResponse.json({ error: votesError.message }, { status: 500 })
    }

    if (!votesData) {
      return NextResponse.json({ votes: [] })
    }

    // שליפת פרטי משתמשים עבור כל הצבעה
    const votesWithUsers = await Promise.all(
      votesData.map(async (vote) => {
        const { data: userProfile } = await supabase
          .from('users')
          .select('first_name, last_name, phone')
          .eq('id', vote.user_id)
          .single()

        return {
          ...vote,
          user: userProfile
        }
      })
    )

    return NextResponse.json({ votes: votesWithUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
