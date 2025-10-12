import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_CONFIG } from './supabase-config'

export function createClient() {
  const supabaseUrl = SUPABASE_CONFIG.url
  const supabaseKey = SUPABASE_CONFIG.anonKey

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating Supabase client')
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(
    String(supabaseUrl),
    String(supabaseKey)
  )
}
