import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

// Recipient claims a gift. The gift link is /redeem?code=GIFT-XXXX-XXXX — if they
// weren't logged in, App showed them login first and the URL (with the code) is
// preserved, so this page still has the code once they're in.
export default function Redeem() {
  const [params] = useSearchParams()
  const [code, setCode] = useState('')
  const [state, setState] = useState('idle') // idle | working | done | error
  const [result, setResult] = useState(null)

  useEffect(() => {
    const c = params.get('code')
    if (c) setCode(c.toUpperCase())
  }, [params])

  const ERRORS = {
    invalid: "We couldn't find that code. Double-check it and try again.",
    already_redeemed: 'This gift has already been claimed.',
    not_paid: "This gift isn't ready yet — the payment hasn't cleared. Try again shortly.",
    not_signed_in: 'Please log in first, then claim your gift.',
  }

  async function redeem(e) {
    e?.preventDefault()
    if (!code.trim()) return
    setState('working')
    const { data, error } = await supabase.rpc('redeem_gift', { p_code: code.trim() })
    if (error) { setResult({ error: error.message }); setState('error'); return }
    if (data?.ok) { setResult(data); setState('done') }
    else { setResult({ error: ERRORS[data?.error] || 'Something went wrong.' }); setState('error') }
  }

  return (
    <div style={{ maxWidth: 460, margin: '40px auto 0' }}>
      <div className="label">Gift</div>
      <h1 className="serif" style={{ fontSize: 30, margin: '4px 0 6px' }}>Claim your season pass</h1>

      {state === 'done' ? (
        <div className="card" style={{ borderColor: 'var(--rose-deep)', background: 'var(--blush)', marginTop: 18 }}>
          <div style={{ fontSize: 34 }}>🎁</div>
          <div className="serif" style={{ fontSize: 22, margin: '6px 0' }}>You're all set!</div>
          <p style={{ margin: '0 0 14px' }}><b>{result.label}</b> is now unlocked on your account — here on the web <i>and</i> in the Sarah's BB Bible app on your phone. Just log in with this same account.</p>
          <Link to="/" className="btn" style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', textDecoration: 'none' }}>Start watching along ›</Link>
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>Someone gifted you a pass. Enter the code below to unlock it on your account.</p>
          <form onSubmit={redeem} style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <input
              className="input" value={code} autoFocus
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GIFT-XXXX-XXXX"
              style={{ letterSpacing: 2, fontWeight: 700, textAlign: 'center', fontSize: 18 }}
            />
            {state === 'error' && <div style={{ color: '#B3261E', fontSize: 14 }}>{result?.error}</div>}
            <button className="btn" type="submit" disabled={state === 'working' || !code.trim()}
              style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', opacity: state === 'working' ? .6 : 1 }}>
              {state === 'working' ? 'Claiming…' : 'Claim my gift'}
            </button>
          </form>
          <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
            Want to gift one instead? <Link to="/gift" style={{ color: 'var(--rose-deep)' }}>Send a pass ›</Link>
          </p>
        </>
      )}
    </div>
  )
}
