import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    // שליפת כל התוצאות
    const { data: resultsData } = await supabase
      .from('results')
      .select('*')

    if (!resultsData || resultsData.length === 0) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 })
    }

    // יצירת אובייקט עם התוצאות הנכונות
    const targetPredictions: Record<string, number> = {}
    resultsData.forEach(r => {
      if (r.actual_score !== null) {
        targetPredictions[r.candidate_name] = r.actual_score
      }
    })

    // שליפת כל ההצבעות ממוינות לפי זמן
    const { data: votesData } = await supabase
      .from('votes')
      .select('*')
      .order('client_timestamp', { ascending: true })

    if (!votesData || votesData.length === 0) {
      return NextResponse.json({ error: 'No votes found' }, { status: 404 })
    }

    // חיפוש הניחוש המדויק הראשון
    for (const vote of votesData) {
      let isExactMatch = true

      for (const [candidateName, actualScore] of Object.entries(targetPredictions)) {
        if (vote.predictions[candidateName] !== actualScore) {
          isExactMatch = false
          break
        }
      }

      if (isExactMatch) {
        // שליפת פרטי המשתמש הזוכה
        const { data: userProfile } = await supabase
          .from('users')
          .select('first_name, last_name, phone')
          .eq('id', vote.user_id)
          .single()

        const userName = userProfile
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : 'משתמש לא ידוע'
        const contactInfo = userProfile?.phone || 'אין מידע'
        const timestamp = new Date(vote.client_timestamp).toLocaleString('he-IL')

        return NextResponse.json({
          winner: {
            name: userName,
            contact: contactInfo,
            timestamp: timestamp,
            vote: vote
          }
        })
      }
    }

    return NextResponse.json({ winner: null, message: 'לא נמצא ניחוש מדויק' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
