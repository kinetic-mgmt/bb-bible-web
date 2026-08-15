import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

const rowBtn = (border, clickable) => ({
  position: 'relative', textAlign: 'left', width: '100%',
  border: `1px solid ${border}`, borderRadius: 10, padding: '11px 14px',
  background: 'var(--card)', cursor: clickable ? 'pointer' : 'default', overflow: 'hidden',
})

// A poll: tap an option to vote (or change your vote); tallies fill in live.
export function PollCard({ poll }) {
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.rpc('poll_results', { p_poll: poll.id })
    setRes(data || { counts: (poll.options || []).map(() => 0), total: 0, my_vote: null })
  }
  useEffect(() => { load() }, [poll.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function vote(i) {
    setBusy(true)
    const { error } = await supabase.rpc('vote_poll', { p_poll: poll.id, p_option: i })
    if (!error) await load()
    setBusy(false)
  }

  const total = res?.total || 0
  const voted = res && res.my_vote != null

  return (
    <div className="card">
      <div className="label">Poll{poll.prize ? ` · 🎁 ${poll.prize}` : ''}</div>
      <div className="serif" style={{ fontSize: 18, margin: '4px 0 12px' }}>{poll.question}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {(poll.options || []).map((o, i) => {
          const c = res?.counts?.[i] ?? 0
          const pct = total > 0 ? Math.round((c / total) * 100) : 0
          const mine = res?.my_vote === i
          return (
            <button key={i} disabled={busy} onClick={() => vote(i)} style={rowBtn(mine ? 'var(--rose-deep)' : 'var(--border)', true)}>
              {voted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--blush)', transition: 'width .4s', zIndex: 0 }} />}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, color: 'var(--ink)', fontWeight: mine ? 700 : 500 }}>
                <span>{mine ? '✓ ' : ''}{o}</span>
                {voted && <span className="muted">{pct}%</span>}
              </div>
            </button>
          )
        })}
      </div>
      {voted && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{total} vote{total === 1 ? '' : 's'} · tap to change</div>}
    </div>
  )
}

// A prediction: pick before it locks; shows the correct answer once it's resolved.
export function PredictionCard({ pred }) {
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.rpc('prediction_results', { p_pred: pred.id })
    setRes(data)
  }
  useEffect(() => { load() }, [pred.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(i) {
    if (res?.locked) return
    setBusy(true)
    const { error } = await supabase.rpc('pick_prediction', { p_pred: pred.id, p_option: i })
    if (!error) await load()
    setBusy(false)
  }

  const total = res?.total || 0
  const locked = !!res?.locked
  const picked = res && res.my_pick != null
  const resolved = res && res.correct_index != null

  return (
    <div className="card">
      <div className="label">Prediction{pred.prize ? ` · 🎁 ${pred.prize}` : ''}{locked ? ' · 🔒 locked' : ''}</div>
      <div className="serif" style={{ fontSize: 18, margin: '4px 0 12px' }}>{pred.question}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {(pred.options || []).map((o, i) => {
          const c = res?.counts?.[i] ?? 0
          const pct = total > 0 ? Math.round((c / total) * 100) : 0
          const mine = res?.my_pick === i
          const correct = resolved && res.correct_index === i
          const showBar = picked || locked
          const border = correct ? '#2e7d5b' : mine ? 'var(--rose-deep)' : 'var(--border)'
          return (
            <button key={i} disabled={busy || locked} onClick={() => pick(i)} style={rowBtn(border, !locked)}>
              {showBar && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: correct ? '#EAF6EF' : 'var(--blush)', transition: 'width .4s', zIndex: 0 }} />}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, color: 'var(--ink)', fontWeight: (mine || correct) ? 700 : 500 }}>
                <span>{correct ? '✅ ' : mine ? '✓ ' : ''}{o}</span>
                {showBar && <span className="muted">{pct}%</span>}
              </div>
            </button>
          )
        })}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        {resolved
          ? (picked ? (res.my_pick === res.correct_index ? 'You nailed it! 🎉' : 'Not this time — better luck next one.') : 'The result is in.')
          : locked ? 'Locked — waiting on the result.'
          : picked ? `${total} pick${total === 1 ? '' : 's'} · tap to change`
          : 'Make your pick before it locks.'}
      </div>
    </div>
  )
}
