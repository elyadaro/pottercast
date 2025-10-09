import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_CONFIG } from './supabase-config'

export function createClient() {
  const supabaseUrl = SUPABASE_CONFIG.url
  const supabaseKey = SUPABASE_CONFIG.anonKey

  console.log('Creating Supabase client with:', {
    url: supabaseUrl,
    keyExists: !!supabaseKey,
    urlType: typeof supabaseUrl,
    keyType: typeof supabaseKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseKey?.length || 0,
  })

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing Supabase environment variables. URL: ${supabaseUrl}, Key length: ${supabaseKey?.length}`)
  }

  return createBrowserClient(
    String(supabaseUrl),
    String(supabaseKey)
  )
}
