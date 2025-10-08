import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_SUPABASE_URL : undefined)
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined)

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}`)
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
