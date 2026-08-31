import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

// Passes are gone. You can gift all-access (Lifetime or a Month) or a Coins bundle.
// Prices are the source of truth on the SERVER (gift-checkout edge fn); these are
// just for display and the function re-derives the amount from the product.
const OPTIONS = [
  { product: 'lifetime',   label: 'Lifetime — All Access', price: '$149.99', blurb: 'Every show, forever. The whole Bible, always.' },
  { product: 'month',      label: '1 Month — All Access',  price: '$9.99',   blurb: 'Everything unlocked for 30 days.' },
  { product: 'coins_500',  label: '500 Coins',             price: '$9.99',   blurb: 'Coins to send gifts during the lives.' },
  { product: 'coins_1200', label: '1,200 Coins',           price: '$19.99',  blurb: 'A bigger stash of gifting coins.' },
  { product: 'coins_6500', label: '6,500 Coins',           price: '$49.99',  blurb: 'The big-baller bundle — best value.' },
]

export default function Gift() {
  const [params, setParams] = useSearchParams()
  const [product, setProduct] = useState(OPTIONS[0].product)
  const [recipient, setRecipient] = useState('')
  const [fromName, setFromName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const doneCode = params.get('code') // returned here after Square checkout
  const chosen = OPTIONS.find((o) => o.product === product) || OPTIONS[0]

  async function checkout(e) {
    e.preventDefault()
    setErr('')
    if (!recipient.trim()) { setErr("Add who it's for — their email or @handle."); return }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('gift-checkout', {
      body: { product, recipient: recipient.trim(), from_name: fromName || null, message: message || null },
    })
    setBusy(false)
    if (error || data?.error) {
      const map = {
        not_configured: 'Gift checkout is being set up — payments go live shortly. Hang tight!',
        recipient_required: "Add who it's for — their email or @handle.",
        not_available: 'That gift isn\'t available. Pick another option.',
      }
      setErr(map[data?.error] || data?.error || error?.message || 'Could not start checkout.')
      return
    }
    if (data?.checkout_url) window.location.href = data.checkout_url
  }

  if (doneCode) return <GiftDone code={doneCode} onNew={() => setParams({})} />

  return (
    <div style={{ maxWidth: 560, margin: '36px auto 0' }}>
      <div className="label">Gift</div>
      <h1 className="serif" style={{ fontSize: 32, margin: '4px 0 6px' }}>Gift the Bible</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Treat a friend to all-access or a stack of coins. They claim it on their own account — on the web and in the app.
      </p>

      <form onSubmit={checkout} style={{ display: 'grid', gap: 18, marginTop: 20 }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Choose a gift</div>
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
        </div>

        <div>
          <div className="label" style={{ marginBottom: 6 }}>Who's it for? <span style={{ color: 'var(--rose-deep)' }}>*</span></div>
          <input className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="friend@email.com  or  @theirhandle" required />
          <p className="muted" style={{ fontSize: 12, margin: '6px 2px 0' }}>Their email or in-app @handle. We'll tie the gift code to them.</p>
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
          {busy ? 'Starting checkout…' : `Continue to payment · ${chosen?.price || ''}`}
        </button>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: 0 }}>Secure checkout by Square.</p>
      </form>
    </div>
  )
}

function GiftDone({ code, onNew }) {
  const [gift, setGift] = useState(undefined)
  const link = `${window.location.origin}/redeem?code=${code}`

  async function load() {
    const { data } = await supabase.from('gift_passes').select('label,status,recipient_email,recipient_handle').eq('code', code).maybeSingle()
    setGift(data || null)
  }
  useEffect(() => { load() }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  const paid = gift?.status === 'paid' || gift?.status === 'redeemed'
  const forWho = gift?.recipient_email || (gift?.recipient_handle ? `@${gift.recipient_handle}` : null)
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
            <p style={{ margin: '0 0 4px' }}><b>{gift.label}</b> is ready to send{forWho ? <> to <b>{forWho}</b></> : ''}.</p>
            <p className="muted" style={{ marginTop: 0 }}>Send them this code — they claim it on their own account.</p>
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
