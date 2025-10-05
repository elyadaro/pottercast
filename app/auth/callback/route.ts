import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (!sessionError && session) {
      // Get user data from session
      const user = session.user

      // Determine auth provider and extract data
      let authProvider = 'email'
      let email = user.email || null
      let phone = user.phone || null
      let fullName = user.user_metadata?.full_name || user.user_metadata?.name || ''

      // Check provider
      if (user.app_metadata?.provider === 'google') {
        authProvider = 'google'
        fullName = user.user_metadata?.full_name || user.user_metadata?.name || ''
      } else if (user.phone) {
        authProvider = 'phone'
      }

      // Upsert user into users table
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email,
          phone,
          full_name: fullName,
          auth_provider: authProvider,
          last_login: new Date().toISOString(),
        }, {
          onConflict: 'id',
        })

      if (upsertError) {
        console.error('Error upserting user:', upsertError)
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`)
}
