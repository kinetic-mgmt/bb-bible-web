import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

// Self-purchase (Phase 4.5): buy all-access or coins for YOURSELF. Prices are the
// source of truth on the server (gift-checkout edge fn) — these are display-only.
// The flow reuses the gift pipeline: gift-checkout (for_self) → Square → the
// square-webhook marks it paid → this page auto-redeems the buyer's own code.
const OPTIONS = [
  { product: 'lifetime',   label: 'Lifetime — All Access', price: '$149.99', blurb: 'Every show, forever. The whole Bible, always.' },
  { product: 'month',      label: '1 Month — All Access',  price: '$9.99',   blurb: 'Everything unlocked for 30 days.' },
  { product: 'coins_500',  label: '500 Coins',             price: '$9.99',   blurb: 'Coins to send gifts during the lives.' },
  { product: 'coins_1200', label: '1,200 Coins',           price: '$19.99',  blurb: 'A bigger stash of gifting coins.' },
  { product: 'coins_6500', label: '6,500 Coins',           price: '$49.99',  blurb: 'The big-baller bundle — best value.' },
]

export default function Buy() {
  const [params] = useSearchParams()
  const [product, setProduct] = useState(OPTIONS[0].product)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const doneCode = params.get('code') // returned here after Square checkout
  const chosen = OPTIONS.find((o) => o.product === product) || OPTIONS[0]

  async function checkout(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('gift-checkout', { body: { product, for_self: true } })
    setBusy(false)
    if (error || data?.error) {
      const map = {
        not_configured: 'Checkout is being set up — payments go live shortly. Hang tight!',
        not_available: "That option isn't available. Pick another.",
        not_signed_in: 'Please log in first.',
      }
      setErr(map[data?.error] || data?.error || error?.message || 'Could not start checkout.')
      return
    }
    if (data?.checkout_url) window.location.href = data.checkout_url
  }

  if (doneCode) return <BuyDone code={doneCode} />

  return (
    <div style={{ maxWidth: 560, margin: '36px auto 0' }}>
      <div className="label">Get all-access</div>
      <h1 className="serif" style={{ fontSize: 32, margin: '4px 0 6px' }}>Unlock the full Bible</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Every show's recaps, play-along, fantasy and rankings — on the web and in the app, tied to this account.
      </p>

      <form onSubmit={checkout} style={{ display: 'grid', gap: 18, marginTop: 20 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {OPTIONS.map((o) => (
            <label key={o.product} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              borderColor: product === o.product ? 'var(--rose-deep)' : 'var(--border)',
              background: product === o.product ? 'var(--blush)' : 'var(--card)',
            }}>
              <input type="radio" name="product" checked={product === o.product}
                onChange={() => setProduct(o.product)} style={{ accentColor: 'var(--rose-deep)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{o.label}</div>
                <div className="muted" style={{ fontSize: 12 }}>{o.blurb}</div>
              </div>
              <div className="serif" style={{ fontSize: 18, color: 'var(--rose-deep)' }}>{o.price}</div>
            </label>
          ))}
        </div>

        {err && <div style={{ color: '#B3261E', fontSize: 14 }}>{err}</div>}

        <button className="btn" type="submit" disabled={busy}
          style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', opacity: busy ? .6 : 1, fontSize: 16, padding: '14px 24px' }}>
          {busy ? 'Starting checkout…' : `Continue to payment · ${chosen?.price || ''}`}
        </button>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: 0 }}>Secure checkout by Square.</p>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: 0 }}>
          Got a code instead? <Link to="/redeem" style={{ color: 'var(--rose-deep)' }}>Redeem it ›</Link>
        </p>
      </form>
    </div>
  )
}

// After Square redirects back with ?code=, wait for the webhook to mark it paid,
// then auto-redeem the buyer's own code so access lands with no extra step.
function BuyDone({ code }) {
  const [state, setState] = useState('checking') // checking | done | error
  const [label, setLabel] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    setState('checking')
    setErr('')
    for (let i = 0; i < 24; i++) {
      const { data } = await supabase.from('gift_passes').select('status,label').eq('code', code).maybeSingle()
      if (data?.status === 'redeemed') { setLabel(data.label || ''); setState('done'); return }
      if (data?.status === 'paid') {
        const { data: r } = await supabase.rpc('redeem_gift', { p_code: code })
        if (r?.ok) { setLabel(r.label || data.label || ''); setState('done'); return }
        // 'already_redeemed' means it landed on a retry — treat as success.
        if (r?.error === 'already_redeemed') { setLabel(data.label || ''); setState('done'); return }
        setErr('We couldn\'t unlock it automatically. Try refreshing in a moment.'); setState('error'); return
      }
      await new Promise((res) => setTimeout(res, 2500))
    }
    setState('error')
    setErr('Your payment is still processing. Give it a moment, then refresh this page.')
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto 0' }}>
      <div className="card" style={{ borderColor: 'var(--rose-deep)', background: 'var(--blush)' }}>
        {state === 'done' ? (
          <>
            <div style={{ fontSize: 34 }}>🎉</div>
            <div className="serif" style={{ fontSize: 24, margin: '6px 0' }}>You're all set!</div>
            <p style={{ margin: '0 0 14px' }}><b>{label}</b> is on your account now — here on the web <i>and</i> in the app when you sign in with the same account.</p>
            {/* full reload so App re-reads access and drops the paywall */}
            <a href="/" className="btn" style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', textDecoration: 'none' }}>Start watching along ›</a>
          </>
        ) : state === 'error' ? (
          <>
            <div style={{ fontSize: 34 }}>⏳</div>
            <div className="serif" style={{ fontSize: 22, margin: '6px 0' }}>Almost there</div>
            <p style={{ margin: '0 0 12px' }}>{err}</p>
            <button className="btn btn-outline" onClick={run}>Refresh</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 34 }}>💳</div>
            <div className="serif" style={{ fontSize: 22, margin: '6px 0' }}>Confirming your payment…</div>
            <p className="muted" style={{ margin: 0 }}>This just takes a second.</p>
          </>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}><Link to="/" style={{ color: 'var(--rose-deep)' }}>‹ Back</Link></p>
    </div>
  )
}
