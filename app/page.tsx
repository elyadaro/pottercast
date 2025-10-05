'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import type { User } from '@supabase/supabase-js'

type Candidate = {
  id: string
  name: string
  display_order: number
}

type Vote = {
  id: string
  predictions: Record<string, number>
  client_timestamp: string
  updated_at: string
}

function VotingPageContent({ user }: { user: User }) {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [existingVote, setExistingVote] = useState<Vote | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userFullName, setUserFullName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Load user data
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserFullName(userData.full_name)
    }

    // Load candidates
    const { data: candidatesData } = await supabase
      .from('candidates')
      .select('id, name, display_order')
      .eq('is_active', true)
      .order('display_order')

    if (candidatesData) {
      setCandidates(candidatesData)

      // Load existing vote
      const { data: voteData } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (voteData) {
        setExistingVote(voteData)
        // Populate predictions from existing vote
        const votePredictions: Record<string, string> = {}
        candidatesData.forEach(c => {
          votePredictions[c.name] = voteData.predictions[c.name]?.toString() || ''
        })
        setPredictions(votePredictions)
      } else {
        // Initialize empty predictions
        const initialPredictions: Record<string, string> = {}
        candidatesData.forEach(c => initialPredictions[c.name] = '')
        setPredictions(initialPredictions)
      }
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

    setSubmitting(true)

    // Convert predictions to numbers
    const numericPredictions: Record<string, number> = {}
    Object.entries(predictions).forEach(([name, value]) => {
      numericPredictions[name] = parseFloat(value)
    })

    const now = new Date().toISOString()

    if (existingVote) {
      // Update existing vote
      const { error } = await supabase
        .from('votes')
        .update({
          predictions: numericPredictions,
          client_timestamp: now,
        })
        .eq('id', existingVote.id)

      if (error) {
        alert('שגיאה בעדכון הניחוש')
        console.error(error)
      } else {
        alert('הניחוש עודכן בהצלחה! הזמן התעדכן.')
        setExistingVote({ ...existingVote, predictions: numericPredictions, client_timestamp: now })
      }
    } else {
      // Insert new vote
      const { data, error } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          predictions: numericPredictions,
          client_timestamp: now,
        })
        .select()
        .single()

      if (error) {
        alert('שגיאה בשמירת הניחוש')
        console.error(error)
      } else {
        alert('הניחוש נשמר בהצלחה!')
        setExistingVote(data)
      }
    }

    setSubmitting(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
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
        {/* User info bar */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex justify-between items-center">
          <div className="text-lg">
            <span className="text-gray-600">שלום, </span>
            <span className="font-bold text-purple-600">{userFullName}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            התנתק
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
            ניחושי מדד הפוטריות
          </h1>
          <p className="text-center text-gray-600 mb-2">
            נחש את הציון שכל מועמד ייתן (1-10.5)
          </p>
          {existingVote && (
            <p className="text-center text-sm text-purple-600 mb-6">
              יש לך ניחוש קיים • ניתן לערוך (הזמן יתעדכן)
            </p>
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
                  disabled={submitting}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-purple-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-purple-700 disabled:bg-gray-400 transition shadow-lg"
          >
            {submitting ? 'שומר...' : existingVote ? 'עדכן ניחוש' : 'שלח ניחוש'}
          </button>

          {existingVote && (
            <p className="text-center text-sm text-gray-500 mt-4">
              זמן ניחוש אחרון: {new Date(existingVote.client_timestamp).toLocaleString('he-IL')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VotingPage() {
  return (
    <AuthGuard>
      {(user) => <VotingPageContent user={user} />}
    </AuthGuard>
  )
}
