'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TestPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testDatabase = async () => {
    try {
      setLoading(true)
      setResult('טוען...')

      const supabase = createClient()
      const { data, error } = await supabase
        .from('candidates')
        .select('name')
        .limit(1)

      if (error) {
        setResult(`שגיאה: ${error.message}`)
      } else {
        setResult(`הצלחה! קיבלתי: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      setResult(`שגיאה כללית: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Hello World</h1>
      <p>אם אתה רואה את זה, הדף עובד!</p>
      <p>Current time: {new Date().toLocaleString('he-IL')}</p>

      <hr style={{ margin: '20px 0' }} />

      <button
        onClick={testDatabase}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: loading ? 'wait' : 'pointer',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        {loading ? 'בודק...' : 'בדוק חיבור לדאטהבייס'}
      </button>

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          wordBreak: 'break-word'
        }}>
          {result}
        </div>
      )}
    </div>
  )
}
