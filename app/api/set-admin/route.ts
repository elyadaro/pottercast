import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { adminCode, userId } = await request.json()

    // Validate admin code
    const secretCode = process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE || 'POTTER2025'
    if (adminCode !== secretCode) {
      return NextResponse.json({ error: 'Invalid admin code' }, { status: 403 })
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Update user to admin
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_admin: true })
      .eq('id', userId)

    if (updateError) {
      console.error('Error setting admin:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in set-admin route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

