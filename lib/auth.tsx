'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'  // Adjust path if necessary
import { Session, User } from '@supabase/supabase-js'  // Import types if needed

export const useSupabaseAuth = () => {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) console.error('Google sign in error:', error)
  }

  const signInWithEmail = async (email: string) => {
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    if (error) console.error('Email sign in error:', error)
    else alert('קישור התחברות נשלח לדוא"ל שלך')
  }

  const signInWithPhone = async (phone: string) => {
    if (!phone) return
    // Assuming Israeli phone, adjust prefix as needed (e.g., +972 for Israel)
    const fullPhone = phone.startsWith('+') ? phone : `+972${phone.replace(/^0/, '')}`
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone
    })
    if (error) console.error('Phone sign in error:', error)
    else alert('קוד אימות נשלח לטלפון שלך')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign out error:', error)
  }

  return {
    user,
    session,
    signInWithGoogle,
    signInWithEmail,
    signInWithPhone,
    signOut
  }
}
