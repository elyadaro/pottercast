'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Candidate = {
  id: string
  name: string
  is_active: boolean
  display_order: number
}

type Result = {
  candidate_name: string
  actual_score: number | null
}

type Vote = {
  id: string
  user_name: string
  user_email: string | null
  predictions: Record<string, number>
  client_timestamp: string
}

export default function AdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [results, setResults] = useState<Record<string, string>>({})
  const [winner, setWinner] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Load candidates
    const { data: candidatesData } = await supabase
      .from('candidates')
      .select('*')
      .order('display_order')

    if (candidatesData) {
      setCandidates(candidatesData)

      // Initialize results
      const initialResults: Record<string, string> = {}
      candidatesData.forEach(c => initialResults[c.name] = '')

      // Load existing results
      const { data: resultsData } = await supabase
        .from('results')
        .select('*')

      if (resultsData) {
        resultsData.forEach(r => {
          initialResults[r.candidate_name] = r.actual_score?.toString() || ''
        })
      }

      setResults(initialResults)
    }

    setLoading(false)
  }

  async function toggleCandidate(candidateId: string, currentActive: boolean) {
    const { error } = await supabase
      .from('candidates')
      .update({ is_active: !currentActive })
      .eq('id', candidateId)

    if (!error) {
      setCandidates(prev =>
        prev.map(c => c.id === candidateId ? { ...c, is_active: !currentActive } : c)
      )
    }
  }

  async function saveResults() {
    // Validate all results are filled
    const activeCandidates = candidates.filter(c => c.is_active)
    const allFilled = activeCandidates.every(c => results[c.name]?.trim() !== '')

    if (!allFilled) {
      alert('נא למלא את כל התוצאות של המועמדים הפעילים')
      return
    }

    // Validate all are valid numbers
    const allValid = activeCandidates.every(c => {
      const val = parseFloat(results[c.name])
      return !isNaN(val) && val >= 1 && val <= 10.5
    })

    if (!allValid) {
      alert('הערכים חייבים להיות מספרים בין 1 ל-10.5')
      return
    }

    // Save to database (upsert)
    for (const candidate of activeCandidates) {
      const score = parseFloat(results[candidate.name])

      const { error } = await supabase
        .from('results')
        .upsert({
          candidate_name: candidate.name,
          actual_score: score,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'candidate_name'
        })

      if (error) {
        alert(`שגיאה בשמירת תוצאה עבור ${candidate.name}`)
        return
      }
    }

    alert('התוצאות נשמרו בהצלחה!')
  }

  async function findWinner() {
    // Get all results
    const { data: resultsData } = await supabase
      .from('results')
      .select('*')

    if (!resultsData || resultsData.length === 0) {
      alert('לא נשמרו תוצאות עדיין')
      return
    }

    // Create target predictions object
    const targetPredictions: Record<string, number> = {}
    resultsData.forEach(r => {
      if (r.actual_score !== null) {
        targetPredictions[r.candidate_name] = r.actual_score
      }
    })

    // Get all votes ordered by client_timestamp
    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .order('client_timestamp', { ascending: true })

    if (!votes || votes.length === 0) {
      alert('אין הצבעות במערכת')
      return
    }

    // Find first exact match
    for (const vote of votes as Vote[]) {
      let isExactMatch = true

      for (const [candidateName, actualScore] of Object.entries(targetPredictions)) {
        if (vote.predictions[candidateName] !== actualScore) {
          isExactMatch = false
          break
        }
      }

      if (isExactMatch) {
        const winnerName = vote.user_email || vote.user_name
        const timestamp = new Date(vote.client_timestamp).toLocaleString('he-IL')
        setWinner(`🏆 הזוכה: ${winnerName}\nזמן הצבעה: ${timestamp}`)
        return
      }
    }

    setWinner('לא נמצא ניחוש מדויק')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">טוען...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          עמוד מנהלים
        </h1>

        {/* Candidates Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">בחירת מועמדים פעילים</h2>
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`candidate-${candidate.id}`}
                  checked={candidate.is_active}
                  onChange={() => toggleCandidate(candidate.id, candidate.is_active)}
                  className="w-5 h-5 text-purple-600 cursor-pointer"
                />
                <label
                  htmlFor={`candidate-${candidate.id}`}
                  className="text-lg font-medium cursor-pointer"
                >
                  {candidate.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Results Input */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">הזנת תוצאות סופיות</h2>
          <div className="space-y-4 mb-6">
            {candidates.filter(c => c.is_active).map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-4">
                <label className="w-24 text-lg font-semibold text-gray-700">
                  {candidate.name}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={results[candidate.name] || ''}
                  onChange={(e) =>
                    setResults(prev => ({ ...prev, [candidate.name]: e.target.value }))
                  }
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-lg text-center"
                  placeholder="1.0 - 10.5"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveResults}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 transition"
          >
            שמור תוצאות
          </button>
        </div>

        {/* Find Winner */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">מציאת הזוכה</h2>
          <button
            onClick={findWinner}
            className="w-full bg-green-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-700 transition mb-4"
          >
            מי הראשון? 🎯
          </button>
          {winner && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 text-center">
              <pre className="text-xl font-bold text-gray-800 whitespace-pre-wrap">
                {winner}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
