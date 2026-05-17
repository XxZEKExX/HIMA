import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState('iniciando...')

  useEffect(() => {
    setStatus('haciendo fetch directo...')

    fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      }
    })
      .then(r => r.json())
      .then(data => setStatus(`fetch directo OK: ${JSON.stringify(data)}`))
      .catch(e => setStatus(`fetch directo ERROR: ${e.message}`))

    supabase.from('profiles').select('id').limit(1)
      .then(({ data, error }) => {
        setStatus(prev => prev + ` | supabase: ${JSON.stringify(data)} error: ${JSON.stringify(error)}`)
      })
  }, [])

  return <div style={{ padding: 20, fontSize: 14 }}>{status}</div>
}
