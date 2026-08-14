import { useState } from 'react'
import { supabase } from '../supabase.js'

export default function Login() {
  const [mode, setMode] = useState('in') // 'in' | 'up'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null); setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg('Check your email to confirm, then sign in.')
      }
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100%', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="serif" style={{ fontStyle: 'italic', fontSize: 16, color: 'var(--rose-deep)' }}>Sarah's</div>
          <div className="serif" style={{ fontStyle: 'italic', fontSize: 34, fontWeight: 700 }}>BB Bible</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>Your reality-TV companion, now on the web.</div>
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <div style={{ color: 'var(--rose-deep)', fontSize: 13 }}>{err}</div>}
          {msg && <div style={{ color: 'var(--rose-deep)', fontSize: 13 }}>{msg}</div>}
          <button className="btn" type="submit" disabled={busy}>{busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="muted" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
            onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(null); setMsg(null) }}>
            {mode === 'in' ? "New here? Create an account" : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
