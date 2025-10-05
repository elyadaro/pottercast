'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState<'google' | 'email' | 'phone' | null>(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  async function signInWithGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setMessage('שגיאה בהתחברות עם Google')
      console.error(error)
    }
    setLoading(false)
  }

  async function signInWithEmail() {
    if (!email || !fullName) {
      setMessage('נא למלא שם מלא וכתובת דואר אלקטרוני')
      return
    }

    setLoading(true)

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: {
          full_name: fullName,
          auth_provider: 'email',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage('שגיאה בשליחת קישור התחברות')
      console.error(error)
    } else {
      setMessage('נשלח קישור התחברות לדואר האלקטרוני שלך! בדוק את תיבת הדואר')
    }
    setLoading(false)
  }

  async function signInWithPhone() {
    if (!phone || !fullName) {
      setMessage('נא למלא שם מלא ומספר טלפון')
      return
    }

    setLoading(true)

    // Send OTP
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: {
          full_name: fullName,
          auth_provider: 'phone',
        },
      },
    })

    if (error) {
      setMessage('שגיאה בשליחת קוד אימות')
      console.error(error)
    } else {
      setMessage('נשלח קוד אימות לטלפון שלך!')
      // You might want to show an OTP input field here
    }
    setLoading(false)
  }

  if (authMethod === 'email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <button
            onClick={() => setAuthMethod(null)}
            className="text-purple-600 mb-4 hover:text-purple-700"
          >
            ← חזור
          </button>

          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
            התחברות עם דואר אלקטרוני
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם מלא (פרטי ומשפחה)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="שם מלא"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                כתובת דואר אלקטרוני
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="email@example.com"
                disabled={loading}
              />
            </div>

            <button
              onClick={signInWithEmail}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'שולח...' : 'שלח קישור התחברות'}
            </button>

            {message && (
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 text-center text-blue-800">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (authMethod === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <button
            onClick={() => setAuthMethod(null)}
            className="text-purple-600 mb-4 hover:text-purple-700"
          >
            ← חזור
          </button>

          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
            התחברות עם SMS
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם מלא (פרטי ומשפחה)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="שם מלא"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מספר טלפון (עם קידומת בינלאומית)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 text-left"
                placeholder="+972501234567"
                dir="ltr"
                disabled={loading}
              />
            </div>

            <button
              onClick={signInWithPhone}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'שולח...' : 'שלח קוד אימות'}
            </button>

            {message && (
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 text-center text-blue-800">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          ניחושי מדד הפוטריות
        </h1>
        <p className="text-center text-gray-600 mb-8">
          נא להתחבר כדי להשתתף בתחרות
        </p>

        <div className="space-y-4">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-50 disabled:bg-gray-100 transition flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            התחבר עם Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">או</span>
            </div>
          </div>

          <button
            onClick={() => setAuthMethod('email')}
            className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            התחבר עם דואר אלקטרוני
          </button>

          <button
            onClick={() => setAuthMethod('phone')}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            התחבר עם SMS
          </button>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          בהתחברות, אתה מאשר שמילאת את שמך המלא והנכון
          <br />
          כדי שנוכל לקרוא לך אם תזכה! 🎉
        </p>
      </div>
    </div>
  )
}
