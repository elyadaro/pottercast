import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  console.log('Creating Supabase client with:', {
    url: supabaseUrl,
    keyExists: !!supabaseKey,
    urlType: typeof supabaseUrl,
    keyType: typeof supabaseKey
  })

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing Supabase environment variables. URL: ${supabaseUrl}, Key: ${supabaseKey}`)
  }

  return createBrowserClient(
    String(supabaseUrl),
    String(supabaseKey)
  )
}
