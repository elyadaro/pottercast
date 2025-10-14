'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    const response = await fetch('/api/candidates')
    const { candidates: candidatesData } = await response.json()

    if (candidatesData) {
      setCandidates(candidatesData)
      const initialPredictions: Record<string, string> = {}
      candidatesData.forEach((c: Candidate) => initialPredictions[c.name] = '')

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

  async function submitVote(userId: string, retryCount = 0) {
    setSubmitting(true)

    // Convert predictions to numbers
    const numericPredictions: Record<string, number> = {}
    Object.entries(predictions).forEach(([name, value]) => {
      numericPredictions[name] = parseFloat(value)
    })

    const voteData = {
      userId,
      predictions: numericPredictions,
      clientTimestamp: clientTimestamp || new Date().toISOString()
    }

    try {
      let response

      if (isEditMode && existingVote) {
        // Update existing vote
        response = await fetch('/api/votes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(voteData)
        })
      } else {
        // Insert new vote
        response = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(voteData)
        })
      }

      setSubmitting(false)

      if (!response.ok) {
        // Retry once on 503/504/timeout errors
        if (retryCount === 0 && (response.status === 503 || response.status === 504)) {
          console.log('Server busy, retrying in 1 second...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          return submitVote(userId, retryCount + 1)
        }

        alert('שגיאה בשמירת ההצבעה. אנא נסה שנית.')
        console.error('Vote submission failed:', response.status)
      } else {
        alert(isEditMode ? 'הניחוש עודכן בהצלחה!' : 'ההצבעה נשמרה בהצלחה!')
        // Reload to get updated vote
        await loadData()
      }
    } catch (error) {
      setSubmitting(false)

      // Retry once on network errors
      if (retryCount === 0) {
        console.log('Network error, retrying in 1 second...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        return submitVote(userId, retryCount + 1)
      }

      alert('שגיאת רשת. אנא בדוק את החיבור לאינטרנט ונסה שנית.')
      console.error('Vote submission error:', error)
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
            className="w-full bg-purple-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-lg"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                שולח...
              </span>
            ) : (isEditMode ? 'עדכן ניחוש' : 'שלח')}
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
}
