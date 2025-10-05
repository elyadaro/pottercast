'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Candidate = {
  id: string
  name: string
  display_order: number
}

export default function VotingPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [userName, setUserName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadCandidates()
  }, [])

  async function loadCandidates() {
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, display_order')
      .eq('is_active', true)
      .order('display_order')

    if (data) {
      setCandidates(data)
      const initialPredictions: Record<string, string> = {}
      data.forEach(c => initialPredictions[c.name] = '')
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

    setShowNameInput(true)
  }

  async function submitVote() {
    if (!userName.trim()) {
      alert('נא להזין שם מלא')
      return
    }

    setSubmitting(true)
    const clientTimestamp = new Date().toISOString()

    // Convert predictions to numbers
    const numericPredictions: Record<string, number> = {}
    Object.entries(predictions).forEach(([name, value]) => {
      numericPredictions[name] = parseFloat(value)
    })

    const { error } = await supabase
      .from('votes')
      .insert({
        user_name: userName,
        predictions: numericPredictions,
        client_timestamp: clientTimestamp
      })

    setSubmitting(false)

    if (error) {
      alert('שגיאה בשמירת ההצבעה')
      console.error(error)
    } else {
      alert('ההצבעה נשמרה בהצלחה!')
      // Reset form
      setPredictions(prev => {
        const reset: Record<string, string> = {}
        candidates.forEach(c => reset[c.name] = '')
        return reset
      })
      setUserName('')
      setShowNameInput(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl">טוען...</div>
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
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 mb-6 text-center text-lg"
            placeholder="שם מלא"
            disabled={submitting}
          />
          <div className="flex gap-3">
            <button
              onClick={submitVote}
              disabled={submitting}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              {submitting ? 'שולח...' : 'שלח הצבעה'}
            </button>
            <button
              onClick={() => setShowNameInput(false)}
              disabled={submitting}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              חזור
            </button>
          </div>
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
          <p className="text-center text-gray-600 mb-8">
            נחש את הציון שכל מועמד ייתן (1-10.5)
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
            className="w-full bg-purple-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-purple-700 transition shadow-lg"
          >
            שלח
          </button>
        </div>
      </div>
    </div>
  )
}
