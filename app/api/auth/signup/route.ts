import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone, adminCode } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Check if admin code is valid
    const secretCode = 'POTTER2025'
    const isValidAdmin = adminCode === secretCode

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        },
        emailRedirectTo: undefined,
      }
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        first_name: firstName || email.split('@')[0],
        last_name: lastName || '',
        phone: phone || null,
        is_admin: isValidAdmin
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      isAdmin: isValidAdmin
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
