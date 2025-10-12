'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserVote, signOut } from '@/lib/auth'
import AuthModal from '@/components/AuthModal'
import {
  retryWithBackoff,
  parseError,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearFromLocalStorage,
} from '@/lib/error-handler'
import {
  addVoteToQueue,
  subscribeToQueueUpdates,
  getQueueStatus,
  type QueueStatusEvent,
  type QueueStatus,
} from '@/lib/vote-queue'

// Force dynamic rendering on client
export const dynamic = 'force-dynamic'

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
  const [error, setError] = useState<string | null>(null)

  // Queue system state
  const [queueStatus, setQueueStatus] = useState<QueueStatusEvent | null>(null)
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null)

  async function handleLogout() {
    await signOut()
    setUser(null)
    setExistingVote(null)
    setIsEditMode(false)
    router.refresh()
  }

  useEffect(() => {
    loadData()

    // Subscribe to queue updates
    const unsubscribe = subscribeToQueueUpdates((event) => {
      setQueueStatus(event)

      // If vote succeeded, reload data and clear queue state
      if (event.status === 'success') {
        setTimeout(() => {
          setQueueStatus(null)
          setCurrentQueueId(null)
          loadData()
        }, 2000) // Show success message for 2 seconds
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  async function loadData() {
    try {
      setError(null)

      // Try to load candidates from cache first (huge performance win for 300 concurrent users)
      const cachedCandidates = loadFromLocalStorage<{
        data: Candidate[]
        timestamp: number
      }>('candidates_cache')

      const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
      const now = Date.now()
      const isCacheValid = cachedCandidates && (now - cachedCandidates.timestamp < CACHE_TTL)

      // If cache is valid, load candidates immediately (instant load!)
      if (isCacheValid && cachedCandidates.data.length > 0) {
        setCandidates(cachedCandidates.data)
        const initialPredictions: Record<string, string> = {}
        cachedCandidates.data.forEach((c: Candidate) => (initialPredictions[c.name] = ''))
        setPredictions(initialPredictions)
        setLoading(false)
      }

      // Always fetch fresh data in background (for user/vote info)
      const data = await retryWithBackoff(async () => {
        const response = await fetch('/api/init')
        if (!response.ok) {
          const errorData = await response.json()
          throw { status: response.status, message: errorData.error }
        }
        return response.json()
      })

      const { user: currentUser, candidates: candidatesData, vote } = data

      setUser(currentUser)

      // Update cache if we got fresh candidates data
      if (candidatesData && candidatesData.length > 0) {
        saveToLocalStorage('candidates_cache', {
          data: candidatesData,
          timestamp: now
        })
        // Update candidates state if different from cache
        if (!isCacheValid) {
          // Only update if cache wasn't used (to avoid re-render)
          setCandidates(candidatesData)
        }
      }

      // Handle vote data (always update since it's user-specific)
      if (candidatesData) {
        const initialPredictions: Record<string, string> = {}
        candidatesData.forEach((c: Candidate) => (initialPredictions[c.name] = ''))

        // If user has existing vote, load it
        if (vote) {
          setExistingVote(vote)
          setIsEditMode(true)
          // Load existing predictions
          Object.entries(vote.predictions as Record<string, number>).forEach(
            ([name, value]) => {
              initialPredictions[name] = value.toString()
            }
          )
        }

        // Only update predictions if cache wasn't used or if we have vote data
        if (!isCacheValid || vote) {
          setPredictions(initialPredictions)
        }
      }
    } catch (err: any) {
      const appError = parseError(err)
      setError(appError.userMessage)

      // Try to load from localStorage backup
      const backup = loadFromLocalStorage<Record<string, string>>('predictions_backup')
      if (backup) {
        setPredictions(backup)
        setError(
          appError.userMessage + ' (נטענו הנתונים השמורים מהמחשב שלך)'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  function handlePredictionChange(candidateName: string, value: string) {
    const newPredictions = { ...predictions, [candidateName]: value }
    setPredictions(newPredictions)

    // Auto-save to localStorage as backup
    saveToLocalStorage('predictions_backup', newPredictions)
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

    const timestamp = clientTimestamp || new Date().toISOString()

    // Save to localStorage as backup immediately
    saveToLocalStorage('last_vote_backup', {
      userId,
      predictions: numericPredictions,
      clientTimestamp: timestamp
    })

    try {
      // Add to queue instead of direct submission
      const queueId = addVoteToQueue(
        userId,
        numericPredictions,
        timestamp,
        isEditMode
      )

      setCurrentQueueId(queueId)
      setSubmitting(false)

      // Show initial queue status
      const initialStatus = getQueueStatus(queueId)
      if (initialStatus) {
        setQueueStatus(initialStatus)
      }
    } catch (error) {
      setSubmitting(false)
      alert('שגיאה בהוספה לתור. הנתונים נשמרו במחשב שלך - נסה שוב מאוחר יותר.')
      console.error('Failed to add to queue:', error)
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

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-red-600 text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-red-800 text-sm">{error}</p>
                  <button
                    onClick={() => {
                      setError(null)
                      loadData()
                    }}
                    className="mt-2 text-red-600 hover:text-red-700 text-sm underline"
                  >
                    נסה שוב
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Queue Status Display */}
          {queueStatus && (
            <div className={`mb-4 p-4 rounded-lg border-2 ${
              queueStatus.status === 'success'
                ? 'bg-green-50 border-green-300'
                : queueStatus.status === 'failed'
                ? 'bg-red-50 border-red-300'
                : queueStatus.status === 'sending'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-start gap-3">
                {/* Animated icon based on status */}
                <span className={`text-2xl ${
                  queueStatus.status === 'success' ? '' :
                  queueStatus.status === 'sending' ? 'animate-pulse' :
                  queueStatus.status === 'retrying' ? 'animate-bounce' : ''
                }`}>
                  {queueStatus.status === 'success' && '✅'}
                  {queueStatus.status === 'failed' && '❌'}
                  {queueStatus.status === 'sending' && '📤'}
                  {(queueStatus.status === 'pending' || queueStatus.status === 'retrying') && '⏳'}
                </span>

                <div className="flex-1">
                  {/* Main message */}
                  <p className={`font-semibold mb-1 ${
                    queueStatus.status === 'success' ? 'text-green-800' :
                    queueStatus.status === 'failed' ? 'text-red-800' :
                    queueStatus.status === 'sending' ? 'text-blue-800' :
                    'text-yellow-800'
                  }`}>
                    {queueStatus.message}
                  </p>

                  {/* Progress indicator */}
                  {queueStatus.status !== 'success' && queueStatus.status !== 'failed' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>ניסיון {queueStatus.attempts}/{queueStatus.maxAttempts}</span>
                        {queueStatus.totalInQueue && queueStatus.totalInQueue > 1 && (
                          <span>{queueStatus.totalInQueue} משתמשים בתור</span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            queueStatus.status === 'sending' ? 'bg-blue-500 animate-pulse' :
                            queueStatus.status === 'retrying' ? 'bg-yellow-500' :
                            'bg-purple-500'
                          }`}
                          style={{
                            width: `${(queueStatus.attempts / queueStatus.maxAttempts) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Additional info for retrying state */}
                  {queueStatus.status === 'retrying' && queueStatus.attempts >= 3 && (
                    <p className="text-xs text-gray-600 mt-2">
                      💡 אתה יכול לסגור את הדף - המערכת תמשיך לנסות ברקע
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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
}
