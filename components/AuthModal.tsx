'use client'

import { useState } from 'react'

type AuthModalProps = {
  onSuccess: () => void
  onCancel: () => void
  showAlreadyVotedOption?: boolean
  loginOnly?: boolean
  adminCode?: string
}

export default function AuthModal({ onSuccess, onCancel, showAlreadyVotedOption, loginOnly, adminCode }: AuthModalProps) {
  const [mode, setMode] = useState<'choice' | 'email' | 'phone' | 'login'>(loginOnly ? 'login' : 'choice')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailSignup() {
    if (!email || !firstName || !lastName) {
      setError('נא למלא את כל השדות')
      return
    }

    setLoading(true)
    setError('')

    // Generate dummy password
    const dummyPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16)

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: dummyPassword,
        firstName,
        lastName,
        adminCode
      })
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      setError(data.error || 'שגיאה בהרשמה')
      setLoading(false)
      return
    }

    onSuccess()
  }

  async function handlePhoneSignup() {
    if (!phone || !firstName || !lastName) {
      setError('נא למלא את כל השדות')
      return
    }

    setLoading(true)
    setError('')

    // For phone, we'll use email format: phone@pottercast.local
    const phoneEmail = `${phone.replace(/\D/g, '')}@pottercast.local`
    const dummyPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16)

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: phoneEmail,
        password: dummyPassword,
        firstName,
        lastName,
        phone,
        adminCode
      })
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      setError(data.error || 'שגיאה בהרשמה')
      setLoading(false)
      return
    }

    onSuccess()
  }

  async function handleLogin() {
    if (!email || !password) {
      setError('נא למלא אימייל וסיסמה')
      return
    }

    setLoading(true)
    setError('')

    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      setError('שגיאה בהתחברות. אם שכחת את הסיסמה, צור חשבון חדש.')
      setLoading(false)
      return
    }

    onSuccess()
  }

  if (mode === 'choice') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            סיום ההצבעה
          </h2>
          <p className="text-center text-gray-600 mb-8">
            בחר איך להמשיך:
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setMode('email')}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              הרשמה עם אימייל
            </button>

            <button
              onClick={() => setMode('phone')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              הרשמה עם טלפון
            </button>

            {showAlreadyVotedOption && (
              <button
                onClick={() => setMode('login')}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                כבר ניחשתי - התחבר לחשבון
              </button>
            )}

            <button
              onClick={onCancel}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'email') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            הרשמה עם אימייל
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="אימייל"
              disabled={loading}
            />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="שם פרטי"
              disabled={loading}
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="שם משפחה"
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleEmailSignup}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'נרשם...' : 'הרשם'}
            </button>
            <button
              onClick={() => setMode('choice')}
              disabled={loading}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              חזור
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'phone') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            הרשמה עם טלפון
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="מספר טלפון"
              disabled={loading}
            />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="שם פרטי"
              disabled={loading}
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="שם משפחה"
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePhoneSignup}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'נרשם...' : 'הרשם'}
            </button>
            <button
              onClick={() => setMode('choice')}
              disabled={loading}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              חזור
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'login') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            התחבר לחשבון קיים
          </h2>

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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="סיסמה"
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>
            <button
              onClick={() => setMode('choice')}
              disabled={loading}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              חזור
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
