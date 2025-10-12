'use client'

import { useState, useEffect } from 'react'

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
  updated_at: string
  user?: {
    first_name: string
    last_name: string
    phone: string | null
  }
}

export default function AdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [results, setResults] = useState<Record<string, string>>({})
  const [votes, setVotes] = useState<Vote[]>([])
  const [winner, setWinner] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showVotes, setShowVotes] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  async function checkAdminAccess() {
    const response = await fetch('/api/admin/check')
    const { isAdmin: adminStatus } = await response.json()

    setIsAdmin(adminStatus)
    setCheckingAuth(false)

    if (adminStatus) {
      loadData()
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  async function loadData() {
    // Load candidates
    const candidatesResponse = await fetch('/api/admin/candidates')
    const { candidates: candidatesData } = await candidatesResponse.json()

    if (candidatesData) {
      setCandidates(candidatesData)

      // Initialize results
      const initialResults: Record<string, string> = {}
      candidatesData.forEach((c: Candidate) => initialResults[c.name] = '')

      // Load existing results
      const resultsResponse = await fetch('/api/admin/results')
      const { results: resultsData } = await resultsResponse.json()

      if (resultsData) {
        resultsData.forEach((r: Result) => {
          initialResults[r.candidate_name] = r.actual_score?.toString() || ''
        })
      }

      setResults(initialResults)
    }

    setLoading(false)
  }

  async function toggleCandidate(candidateId: string, currentActive: boolean) {
    const response = await fetch('/api/admin/candidates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId,
        isActive: !currentActive
      })
    })

    if (response.ok) {
      setCandidates(prev =>
        prev.map(c => c.id === candidateId ? { ...c, is_active: !currentActive } : c)
      )
    }
  }

  async function saveResults() {
    // Validate that filled fields have valid numbers
    const activeCandidates = candidates.filter(c => c.is_active)
    const filledResults = activeCandidates.filter(c => results[c.name]?.trim() !== '')

    const allValid = filledResults.every(c => {
      const val = parseFloat(results[c.name])
      return !isNaN(val) && val >= 1 && val <= 10.5
    })

    if (!allValid) {
      alert('הערכים חייבים להיות מספרים בין 1 ל-10.5, או להישאר ריקים')
      return
    }

    // Prepare results data - include ALL candidates (active and inactive)
    // Empty or inactive candidates get null
    const resultsToSave = candidates.map(candidate => ({
      candidate_name: candidate.name,
      actual_score: (candidate.is_active && results[candidate.name]?.trim() !== '')
        ? parseFloat(results[candidate.name])
        : null
    }))

    const response = await fetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: resultsToSave })
    })

    if (response.ok) {
      alert('התוצאות נשמרו בהצלחה!')
    } else {
      alert('שגיאה בשמירת התוצאות')
    }
  }

  async function loadAllVotes() {
    const response = await fetch('/api/admin/votes')
    const { votes: votesData } = await response.json()

    if (votesData) {
      setVotes(votesData)
      setShowVotes(true)
    }
  }

  async function findWinner() {
    const response = await fetch('/api/admin/winner')
    const data = await response.json()

    if (data.error) {
      alert(data.error === 'No results found' ? 'לא נשמרו תוצאות עדיין' : 'אין הצבעות במערכת')
      return
    }

    if (data.winner) {
      const { name, contact, timestamp } = data.winner
      setWinner(`🏆 הזוכה: ${name}\nפרטי קשר: ${contact}\nזמן הצבעה: ${timestamp}`)
    } else {
      setWinner('לא נמצא ניחוש מדויק')
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">בודק הרשאות...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-600">אין הרשאת גישה</h1>
          <p className="text-gray-600 mb-6">רק מנהלים יכולים לגשת לדף זה</p>
          <a
            href="/login?code=POTTER2025"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            התחבר כמנהל
          </a>
        </div>
      </div>
    )
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
          <p className="text-sm text-gray-600 mb-4">
            💡 ניתן להשאיר שדות ריקים - הם יישמרו כ-NULL. מועמדים לא פעילים יהפכו אוטומטית ל-NULL.
          </p>
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
                  placeholder="1.0 - 10.5 (או ריק)"
                />
              </div>
            ))}
          </div>
          {candidates.filter(c => !c.is_active).length > 0 && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
              <strong>מועמדים לא פעילים:</strong>{' '}
              {candidates.filter(c => !c.is_active).map(c => c.name).join(', ')}
              {' '}(יוגדרו כ-NULL)
            </div>
          )}
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

        {/* View All Votes */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">כל ההצבעות</h2>
          <button
            onClick={loadAllVotes}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 transition mb-4"
          >
            {showVotes ? 'רענן רשימה' : 'הצג כל ההצבעות'}
          </button>

          {showVotes && votes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="p-2 text-right">שם</th>
                    <th className="p-2 text-right">פרטי קשר</th>
                    <th className="p-2 text-right">זמן</th>
                    <th className="p-2 text-right">ניחושים</th>
                  </tr>
                </thead>
                <tbody>
                  {votes.map((vote) => (
                    <tr key={vote.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2">
                        {vote.user
                          ? `${vote.user.first_name} ${vote.user.last_name}`
                          : 'לא ידוע'}
                      </td>
                      <td className="p-2 text-xs">
                        {vote.user?.phone || 'אין מידע'}
                      </td>
                      <td className="p-2 text-xs">
                        {new Date(vote.client_timestamp).toLocaleString('he-IL')}
                        {vote.updated_at !== vote.client_timestamp && (
                          <div className="text-orange-600">
                            עודכן: {new Date(vote.updated_at).toLocaleString('he-IL')}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-xs">
                        {Object.entries(vote.predictions)
                          .map(([name, score]) => `${name}: ${score}`)
                          .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-600">
                סה"כ {votes.length} הצבעות
              </div>
            </div>
          )}

          {showVotes && votes.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              אין הצבעות במערכת
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
