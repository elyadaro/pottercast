'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import type { User } from '@supabase/supabase-js'

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
  user_id: string
  predictions: Record<string, number>
  client_timestamp: string
}

type UserData = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  auth_provider: string
}

function AdminPageContent({ user }: { user: User }) {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [results, setResults] = useState<Record<string, string>>({})
  const [winner, setWinner] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [allVotes, setAllVotes] = useState<(Vote & { user: UserData })[]>([])
  const [showVotes, setShowVotes] = useState(false)
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

  async function loadAllVotes() {
    const { data: votesData } = await supabase
      .from('votes')
      .select('*')
      .order('client_timestamp', { ascending: true })

    if (votesData) {
      // Load user data for each vote
      const votesWithUsers = await Promise.all(
        votesData.map(async (vote) => {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', vote.user_id)
            .single()

          return {
            ...vote,
            user: userData || { id: vote.user_id, full_name: 'לא ידוע', email: null, phone: null, auth_provider: 'unknown' }
          }
        })
      )

      setAllVotes(votesWithUsers)
      setShowVotes(true)
    }
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
    const { data: votesData } = await supabase
      .from('votes')
      .select('*')
      .order('client_timestamp', { ascending: true })

    if (!votesData || votesData.length === 0) {
      alert('אין ניחושים במערכת')
      return
    }

    // Load user data and find first exact match
    for (const vote of votesData as Vote[]) {
      let isExactMatch = true

      for (const [candidateName, actualScore] of Object.entries(targetPredictions)) {
        if (vote.predictions[candidateName] !== actualScore) {
          isExactMatch = false
          break
        }
      }

      if (isExactMatch) {
        // Get user data
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', vote.user_id)
          .single()

        if (userData) {
          const contactInfo = userData.email || userData.phone || 'אין מידע'
          const timestamp = new Date(vote.client_timestamp).toLocaleString('he-IL')
          setWinner(`🏆 הזוכה: ${userData.full_name}\nאמצעי קשר: ${contactInfo}\nזמן ניחוש: ${timestamp}`)
        }
        return
      }
    }

    setWinner('לא נמצא ניחוש מדויק')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
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
      <div className="max-w-6xl mx-auto">
        {/* Admin header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">
            עמוד מנהלים
          </h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            התנתק
          </button>
        </div>

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

        {/* View All Votes */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">צפייה בכל הניחושים</h2>
          <button
            onClick={loadAllVotes}
            className="w-full bg-purple-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-purple-700 transition mb-4"
          >
            טען את כל הניחושים
          </button>

          {showVotes && allVotes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-right">שם מלא</th>
                    <th className="border p-3 text-right">אמצעי קשר</th>
                    <th className="border p-3 text-right">ספק אימות</th>
                    <th className="border p-3 text-right">זמן ניחוש</th>
                    <th className="border p-3 text-right">ניחושים</th>
                  </tr>
                </thead>
                <tbody>
                  {allVotes.map((vote) => (
                    <tr key={vote.id} className="hover:bg-gray-50">
                      <td className="border p-3 font-semibold">{vote.user.full_name}</td>
                      <td className="border p-3 text-sm">
                        {vote.user.email || vote.user.phone || 'אין מידע'}
                      </td>
                      <td className="border p-3 text-sm">
                        {vote.user.auth_provider === 'google' && '🔵 Google'}
                        {vote.user.auth_provider === 'email' && '📧 Email'}
                        {vote.user.auth_provider === 'phone' && '📱 SMS'}
                      </td>
                      <td className="border p-3 text-sm">
                        {new Date(vote.client_timestamp).toLocaleString('he-IL')}
                      </td>
                      <td className="border p-3 text-sm">
                        {Object.entries(vote.predictions).map(([name, score]) => (
                          <div key={name}>
                            <span className="font-medium">{name}:</span> {score}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showVotes && allVotes.length === 0 && (
            <div className="text-center text-gray-600 py-4">
              אין ניחושים במערכת
            </div>
          )}
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

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin={true}>
      {(user) => <AdminPageContent user={user} />}
    </AuthGuard>
  )
}
