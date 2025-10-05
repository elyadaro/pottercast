'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { signOut } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminCode, setAdminCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function handleLogin() {
    if (!email || !password) {
      setError('נא למלא אימייל וסיסמה')
      return
    }

    setLoading(true)
    setError('')

    // Try to sign in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If sign in failed, try to create new user
    if (signInError) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        }
      })

      if (signUpError) {
        setError('שגיאה ביצירת המשתמש: ' + signUpError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('שגיאה ביצירת המשתמש')
        setLoading(false)
        return
      }

      // Create user profile with basic info
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          first_name: email.split('@')[0],
          last_name: '',
          phone: null
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    // Check admin code
    if (adminCode) {
      const secretCode = process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE || 'POTTER2025'
      if (adminCode === secretCode) {
        localStorage.setItem('is_admin', 'true')
        router.push('/admin')
        return
      } else {
        setError('קוד מנהל שגוי')
        setLoading(false)
        return
      }
    }

    router.push('/')
  }

  async function handleLogout() {
    await signOut()
    localStorage.removeItem('is_admin')
    setUser(null)
    router.push('/')
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
            מחובר כ
          </h1>

          <div className="mb-6 p-4 bg-green-50 rounded-lg text-center">
            <p className="text-gray-700 font-semibold">{user.email}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              לדף הראשי
            </button>

            {localStorage.getItem('is_admin') === 'true' && (
              <button
                onClick={() => router.push('/admin')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                לדף מנהל
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              התנתק
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          התחברות / הרשמה
        </h1>

        <p className="text-center text-gray-600 text-sm mb-4">
          הזן אימייל וסיסמה. אם המשתמש קיים - תתחבר, אם לא - ייווצר אוטומטית
        </p>

        {adminCode && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-blue-700 text-sm font-semibold">
              התחברות כמנהל
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            placeholder="אימייל"
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            placeholder="סיסמה"
            disabled={loading}
          />

          {adminCode && (
            <input
              type="text"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="קוד מנהל"
              disabled={loading}
            />
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'מתחבר...' : 'התחבר / הירשם'}
          </button>

          <button
            onClick={() => router.push('/')}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            חזור לדף הראשי
          </button>
        </div>
      </div>
    </div>
  )
}
