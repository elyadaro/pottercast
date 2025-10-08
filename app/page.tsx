'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getCurrentUser, getUserVote, signOut } from '@/lib/auth'
import AuthModal from '@/components/AuthModal'

type Candidate = {
  id: string
  name: string
  display_order: number
}

type User = {
  id: string
  email?: string
} | null

export default function VotingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      בדיקה
    </div>
  )
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [clientTimestamp, setClientTimestamp] = useState('')
  const [user, setUser] = useState<User>(null)
  const [existingVote, setExistingVote] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleLogout() {
    await signOut()
    setUser(null)
    setExistingVote(null)
    setIsEditMode(false)
    router.refresh()
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Check if user is logged in
    const currentUser = await getCurrentUser()
    setUser(currentUser)

    // Load candidates
    const { data: candidatesData } = await supabase
      .from('candidates')
      .select('id, name, display_order')
      .eq('is_active', true)
      .order('display_order')

    if (candidatesData) {
      setCandidates(candidatesData)
      const initialPredictions: Record<string, string> = {}
      candidatesData.forEach(c => initialPredictions[c.name] = '')

      // If user is logged in, check for existing vote
      if (currentUser) {
        const vote = await getUserVote(currentUser.id)
        if (vote) {
          setExistingVote(vote)
          setIsEditMode(true)
          // Load existing predictions
          Object.entries(vote.predictions as Record<string, number>).forEach(([name, value]) => {
            initialPredictions[name] = value.toString()
          })
        }
      }

      setPredictions(initialPredictions)
    }
    setLoading(false)
  }

  function handlePredictionChange(candidateName: string, value: string) {
    setPredictions(prev => ({ ...prev, [candidateName]: value }))
  }

  async function handleSubmit() {
    // Validate all predictions are filled
    const allFilled = candidates.every(c => predictions[c.name]?.trim() !== '')
    if (!allFilled) {
      alert('נא למלא את כל הניחושים')
      return
    }

    // Validate predictions are valid numbers between 1-10.5
    const allValid = candidates.every(c => {
      const val = parseFloat(predictions[c.name])
      return !isNaN(val) && val >= 1 && val <= 10.5
    })
    if (!allValid) {
      alert('הערכים חייבים להיות מספרים בין 1 ל-10.5')
      return
    }

    // Save timestamp BEFORE showing auth
    setClientTimestamp(new Date().toISOString())

    // If user is already logged in, submit directly
    if (user) {
      await submitVote(user.id)
    } else {
      // Show auth modal
      setShowAuthModal(true)
    }
  }

  async function submitVote(userId: string) {
    setSubmitting(true)

    // Convert predictions to numbers
    const numericPredictions: Record<string, number> = {}
    Object.entries(predictions).forEach(([name, value]) => {
      numericPredictions[name] = parseFloat(value)
    })

    const voteData = {
      user_id: userId,
      predictions: numericPredictions,
      client_timestamp: clientTimestamp || new Date().toISOString()
    }

    let error

    if (isEditMode && existingVote) {
      // Update existing vote
      const result = await supabase
        .from('votes')
        .update(voteData)
        .eq('user_id', userId)
      error = result.error
    } else {
      // Insert new vote
      const result = await supabase
        .from('votes')
        .insert(voteData)
      error = result.error
    }

    setSubmitting(false)

    if (error) {
      alert('שגיאה בשמירת ההצבעה')
      console.error(error)
    } else {
      alert(isEditMode ? 'הניחוש עודכן בהצלחה!' : 'ההצבעה נשמרה בהצלחה!')
      // Reload to get updated vote
      await loadData()
    }
  }

  async function handleAuthSuccess() {
    setShowAuthModal(false)
    // Get the newly logged in user
    const currentUser = await getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      await submitVote(currentUser.id)
    }
  }

  try {
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
          <div className="text-xl">טוען...</div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
              ניחושי מדד הפוטריות
            </h1>
            <p className="text-center text-gray-600 mb-4">
              נחש את הציון שכל מועמד ייתן (1-10.5)
            </p>

            {user && (
              <div className="text-center mb-4">
                <div className="flex justify-center items-center gap-3">
                  <span className="text-sm text-gray-500">
                    מחובר כ: {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-700 underline"
                  >
                    התנתק
                  </button>
                </div>
                {isEditMode && (
                  <span className="block text-sm text-green-600 font-semibold">
                    מצב עריכה - ניתן לשנות את הניחוש
                  </span>
                )}
              </div>
            )}

            <div className="space-y-4 mb-8">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center gap-4">
                  <label className="w-24 text-lg font-semibold text-gray-700">
                    {candidate.name}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={predictions[candidate.name] || ''}
                    onChange={(e) => handlePredictionChange(candidate.name, e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 text-lg text-center"
                    placeholder="1.0 - 10.5"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-purple-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-purple-700 disabled:bg-gray-400 transition shadow-lg"
            >
              {submitting ? 'שולח...' : (isEditMode ? 'עדכן ניחוש' : 'שלח')}
            </button>
          </div>
        </div>

        {showAuthModal && (
          <AuthModal
            onSuccess={handleAuthSuccess}
            onCancel={() => setShowAuthModal(false)}
            showAlreadyVotedOption={!user}
          />
        )}
      </div>
    )
  } catch (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאת רינדור</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg">
            <p className="font-bold mb-2">פרטי השגיאה:</p>
            <pre className="text-sm whitespace-pre-wrap break-words">
              {err instanceof Error ? err.message : String(err)}
            </pre>
            {err instanceof Error && err.stack && (
              <details className="mt-4">
                <summary className="cursor-pointer font-bold">Stack Trace</summary>
                <pre className="text-xs mt-2 whitespace-pre-wrap break-words">
                  {err.stack}
                </pre>
              </details>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700"
          >
            טען מחדש את העמוד
          </button>
        </div>
      </div>
    )
  }
}
