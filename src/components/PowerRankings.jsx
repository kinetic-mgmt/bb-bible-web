import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

// Crown board — tap up to 3 favorites; bars show the fan vote. Same
// power_rankings / toggle_power_vote RPCs as the app (Big Brother houseguests).
export default function PowerRankings({ show }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const { data: d } = await supabase.rpc('power_rankings', { p_show: show })
    setData(d || { board: [], mine: [], voters: 0 })
  }
  useEffect(() => { load() }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  async function crown(num) {
    setErr(''); setBusy(true)
    const { data: r } = await supabase.rpc('toggle_power_vote', { p_num: num, p_show: show })
    if (r && r.ok === false) setErr(r.error || '')
    await load(); setBusy(false)
  }

  if (!data) return <p className="muted">Loading power rankings…</p>
  const board = data.board || []
  if (board.length === 0) return null // no houseguests loaded for this show
  const mine = data.mine || []
  const max = Math.max(1, ...board.map((b) => b.votes || 0))

  return (
    <div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Crown up to 3 of your favorites. {data.voters || 0} fan{data.voters === 1 ? '' : 's'} voting.
      </div>
      {err && <div style={{ color: '#B3261E', fontSize: 13, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {board.map((b, i) => {
          const crowned = mine.includes(b.num)
          const pct = Math.round(((b.votes || 0) / max) * 100)
          return (
            <button key={b.num} disabled={busy} onClick={() => crown(b.num)} className="card" style={{
              position: 'relative', overflow: 'hidden', cursor: 'pointer', textAlign: 'left',
              borderColor: crowned ? 'var(--rose-deep)' : 'var(--border)', padding: '10px 14px',
            }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--blush)', opacity: 0.55, zIndex: 0, transition: 'width .4s' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="serif" style={{ width: 20, color: 'var(--mauve)', fontSize: 16 }}>{i + 1}</span>
                <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--blush)', flex: '0 0 auto', display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>
                  {b.photo_url ? <img src={b.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                    <span className="serif" style={{ color: 'var(--rose-deep)' }}>{(b.name || '?').slice(0, 1)}</span>}
                </div>
                <span style={{ flex: 1, fontWeight: crowned ? 700 : 600, color: 'var(--ink)' }}>{b.name}</span>
                <span style={{ fontSize: 18 }}>{crowned ? '👑' : '🤍'}</span>
                <span className="muted" style={{ fontSize: 13, minWidth: 18, textAlign: 'right' }}>{b.votes}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
