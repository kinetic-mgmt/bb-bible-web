import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

// Prices are the source of truth on the SERVER (gift-checkout edge fn). These are
// just for display; the edge function re-derives the amount from the product.
const ALL = { product: 'all', label: 'All-Access Season Pass', price: '$49.99', blurb: 'Every show, all season — the whole Bible.' }
const SHOW_PRICE = '$9.99'

export default function Gift() {
  const [params, setParams] = useSearchParams()
  const [shows, setShows] = useState([])
  const [session, setSession] = useState(null)
  const [product, setProduct] = useState('all')
  const [toEmail, setToEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const doneCode = params.get('code') // returned here after Square checkout

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    supabase.from('shows').select('slug,name').order('sort').then(({ data }) => setShows(data || []))
  }, [])

  const options = useMemo(() => [ALL, ...shows.map((s) => ({
    product: s.slug, label: `${s.name} Season Pass`, price: SHOW_PRICE, blurb: `Everything for ${s.name}, all season.`,
  }))], [shows])
  const chosen = options.find((o) => o.product === product) || ALL

  async function checkout(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { data, error } = await supabase.functions.invoke('gift-checkout', {
      body: { product, recipient_email: toEmail || null, from_name: fromName || null, message: message || null },
    })
    setBusy(false)
    if (error || data?.error) {
      setErr(data?.error === 'not_configured'
        ? 'Gift checkout is being set up — payments go live shortly. Hang tight!'
        : (data?.error || error?.message || 'Could not start checkout.'))
      return
    }
    if (data?.checkout_url) window.location.href = data.checkout_url
  }

  if (doneCode) return <GiftDone code={doneCode} onNew={() => setParams({})} />

  return (
    <div style={{ maxWidth: 560, margin: '36px auto 0' }}>
      <div className="label">Gift</div>
      <h1 className="serif" style={{ fontSize: 32, margin: '4px 0 6px' }}>Gift a season pass</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Treat a friend to the watch-along. They'll get a code to unlock it on their own account — on the web and in the app.
      </p>

      <form onSubmit={checkout} style={{ display: 'grid', gap: 18, marginTop: 20 }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Choose the pass</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {options.map((o) => (
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
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>Recipient's email <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional — we'll email them the code)</span></div>
          <input className="input" type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="friend@email.com" />
          <p className="muted" style={{ fontSize: 12, margin: '6px 2px 0' }}>Leave blank and you'll get the code to send yourself.</p>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr' }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>From <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></div>
            <input className="input" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Note <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></div>
            <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enjoy the season! 🎁" maxLength={140} />
          </div>
        </div>

        {err && <div style={{ color: '#B3261E', fontSize: 14 }}>{err}</div>}

        <button className="btn" type="submit" disabled={busy}
          style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', opacity: busy ? .6 : 1, fontSize: 16, padding: '14px 24px' }}>
          {busy ? 'Starting checkout…' : `Continue to payment · ${chosen.price}`}
        </button>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: 0 }}>Secure checkout by Square. {session?.user?.email ? `Receipt to ${session.user.email}.` : ''}</p>
      </form>
    </div>
  )
}

function GiftDone({ code, onNew }) {
  const [gift, setGift] = useState(undefined)
  const link = `${window.location.origin}/redeem?code=${code}`

  async function load() {
    const { data } = await supabase.from('gift_passes').select('label,status,recipient_email').eq('code', code).maybeSingle()
    setGift(data || null)
  }
  useEffect(() => { load() }, [code])

  const paid = gift?.status === 'paid' || gift?.status === 'redeemed'
  const copy = () => navigator.clipboard?.writeText(link)

  return (
    <div style={{ maxWidth: 480, margin: '40px auto 0' }}>
      <div className="card" style={{ borderColor: 'var(--rose-deep)', background: 'var(--blush)' }}>
        <div style={{ fontSize: 34 }}>🎁</div>
        <div className="serif" style={{ fontSize: 24, margin: '6px 0' }}>Gift purchased!</div>
        {gift === undefined ? <p className="muted">Loading…</p> : !paid ? (
          <>
            <p style={{ margin: '0 0 8px' }}>We're finalizing the payment. This page will have your shareable code in a moment.</p>
            <button className="btn btn-outline" onClick={load}>Refresh</button>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 4px' }}><b>{gift.label}</b> is ready to send.</p>
            {gift.recipient_email
              ? <p className="muted" style={{ marginTop: 0 }}>We emailed the code to <b>{gift.recipient_email}</b>. You can also share the link below.</p>
              : <p className="muted" style={{ marginTop: 0 }}>Send this to your friend — they claim it on their own account.</p>}
            <div style={{ background: 'var(--card)', border: '1px dashed var(--rose-deep)', borderRadius: 10, padding: '12px 14px', margin: '10px 0' }}>
              <div className="serif" style={{ fontSize: 22, letterSpacing: 2, textAlign: 'center' }}>{code}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={copy} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }}>Copy claim link</button>
              <button className="btn btn-outline" onClick={onNew}>Gift another</button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10, wordBreak: 'break-all' }}>{link}</p>
          </>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}><Link to="/" style={{ color: 'var(--rose-deep)' }}>‹ Back to shows</Link></p>
    </div>
  )
}
