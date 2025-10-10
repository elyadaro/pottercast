'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SUPABASE_CONFIG } from '@/lib/supabase-config'
import { createBrowserClient } from '@supabase/ssr'

export default function TestPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const checkEnvVars = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const configUrl = SUPABASE_CONFIG.url
    const configKey = SUPABASE_CONFIG.anonKey

    setResult(`
ENV VARS:
URL: ${url ? 'מוגדר ✓' : 'חסר ✗'}
KEY: ${key ? 'מוגדר ✓' : 'חסר ✗'}
URL type: ${typeof url}
KEY type: ${typeof key}
URL value: ${String(url) || 'undefined/null'}
URL length: ${url?.length || 0}
URL start: ${url?.substring(0, 13) || 'can not substring'}
KEY first 20 chars: ${key ? key.substring(0, 20) + '...' : 'undefined/null'}

RUNTIME CONFIG (supabase-config.ts):
Config URL: ${configUrl}
Config URL length: ${configUrl.length}
Config Key (first 20): ${configKey.substring(0, 20)}...

FINAL CLIENT:
Client will use URL: ${configUrl}
Match expected? ${configUrl === '                                        ' ? 'YES ✓' : 'NO ✗'}
    `)
  }

  const testDatabase = async () => {
    try {
      setLoading(true)
      setResult('טוען...')

      const supabase = createBrowserClient(
        'https://kfhqutyerebbwjxgtqem.supabase.co',
        SUPABASE_CONFIG.anonKey
      )
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
        onClick={checkEnvVars}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginLeft: '10px'
        }}
      >
        בדוק Environment Variables
      </button>

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
