import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET - קבלת פרופיל משתמש
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Get auth user for email
    const { data: { user } } = await supabase.auth.getUser()

    // Get profile data
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profile = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      email: user?.email || null
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - יצירת פרופיל משתמש
export async function POST(request: NextRequest) {
  try {
    const { userId, firstName, lastName, phone, isAdmin } = await request.json()

    if (!userId || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        is_admin: isAdmin || false
      })

    if (error) {
      console.error('Error creating user profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
