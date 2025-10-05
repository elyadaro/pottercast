'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/lib/auth'  // Assuming you have a custom auth hook or context

type Candidate = {
  id: string
  name: string
  display_order: number
}

export default function VotingPage() {
  const router = useRouter()
  const { user, signInWithGoogle, signInWithEmail, signInWithPhone, signOut } = useSupabaseAuth()  // Custom hook for auth
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [fullName, setFullName] = useState('')
  const [existingVote, setExistingVote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAuthOptions, setShowAuthOptions] = useState(true)
  const [showNameInput, setShowNameInput] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadProfileAndVote()
    } else {
      setLoading(false)
    }
  }, [user])

  async function loadProfileAndVote() {
    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (profile && profile.full_name) {
      setFullName(profile.full_name)
      loadCandidatesAndVote()
    } else {
      setShowNameInput(true)
    }
  }

  async function loadCandidatesAndVote() {
    const { data: candidatesData } = await supabase
      .from('candidates')
      .select('id, name, display_order')
      .eq('is_active', true)
      .order('display_order')

    if (candidatesData) {
      setCandidates(candidatesData)
      const initialPredictions: Record<string, string> = {}
      candidatesData.forEach(c => initialPredictions[c.name] = '')
      setPredictions(initialPredictions)

      // Load existing vote
      const { data: voteData } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (voteData) {
        setExistingVote(voteData)
        const loadedPredictions: Record<string, string> = {}
        candidatesData.forEach(c => {
          loadedPredictions[c.name] = voteData.predictions[c.name]?.toString() || ''
        })
        setPredictions(loadedPredictions)
      }
    }
    setLoading(false)
    setShowAuthOptions(false)
  }

  async function saveFullName() {
    if (!fullName.trim()) {
      alert('נא להזין שם מלא')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)

    if (!error) {
      setShowNameInput(false)
      loadCandidatesAndVote()
    }
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

    const clientTimestamp = new Date().toISOString()

    let error
    if (existingVote) {
      // Update existing vote
      ({ error } = await supabase
        .from('votes')
        .update({
          predictions: numericPredictions,
          client_timestamp: clientTimestamp
        })
        .eq('id', existingVote.id))
    } else {
      // Insert new vote
      ({ error } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          predictions: numericPredictions,
          client_timestamp: clientTimestamp
        }))
    }

    setSubmitting(false)

    if (error) {
      alert('שגיאה בשמירת ההצבעה')
      console.error(error)
    } else {
      alert(existingVote ? 'ההצבעה עודכנה בהצלחה!' : 'ההצבעה נשמרה בהצלחה!')
      // Reload vote
      loadCandidatesAndVote()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl">טוען...</div>
      </div>
    )
  }

  if (showAuthOptions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            התחבר כדי להצביע
          </h2>
          <button
            onClick={signInWithGoogle}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 mb-4"
          >
            התחבר עם Google
          </button>
          <button
            onClick={() => signInWithEmail(prompt('הזן דוא"ל'))}  // Simple prompt for demo; improve in production
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-4"
          >
            התחבר עם דוא"ל
          </button>
          <button
            onClick={() => signInWithPhone(prompt('הזן מספר טלפון'))}  // Simple prompt for demo
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            התחבר עם טלפון
          </button>
        </div>
      </div>
    )
  }

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            נא להזין את שמך המלא
          </h2>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 mb-6 text-center text-lg"
            placeholder="שם מלא"
          />
          <button
            onClick={saveFullName}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700"
          >
            המשך
          </button>
        </div>
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
          <p className="text-center text-gray-600 mb-8">
            שלום, {fullName} | <button onClick={signOut} className="text-blue-600">התנתק</button>
          </p>

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
            className="w-full bg-purple-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-purple-700 transition shadow-lg disabled:bg-gray-400"
          >
            {submitting ? 'שולח...' : (existingVote ? 'עדכן הצבעה' : 'שלח')}
          </button>
        </div>
      </div>
    </div>
  )
}
