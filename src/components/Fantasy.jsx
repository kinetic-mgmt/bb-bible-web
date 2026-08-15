import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'

// Big Brother fantasy — draft your team of houseguests, see the league.
// Same fantasy_leaderboard / save_fantasy_team RPCs as the app.
export default function Fantasy() {
  const [lb, setLb] = useState(null)      // {draft_open, team_size, teams}
  const [roster, setRoster] = useState([])
  const [picks, setPicks] = useState([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    const [{ data: l }, { data: hg }] = await Promise.all([
      supabase.rpc('fantasy_leaderboard'),
      supabase.from('houseguests').select('num,name,photo_url,status,week_evicted').eq('show', 'bigbrother').order('num'),
    ])
    setLb(l || { draft_open: false, team_size: 4, teams: [] })
    setRoster(hg || [])
    const mine = (l?.teams || []).find((t) => t.is_mine)
    if (mine) { setName(mine.team_name || ''); setPicks(mine.picks || []) }
  }
  useEffect(() => { load() }, [])

  const size = lb?.team_size || 4
  const byNum = useMemo(() => Object.fromEntries(roster.map((h) => [h.num, h])), [roster])
  const myTeam = (lb?.teams || []).find((t) => t.is_mine)

  function toggle(num) {
    setErr('')
    setPicks((p) => p.includes(num) ? p.filter((x) => x !== num) : (p.length >= size ? p : [...p, num]))
  }
  async function save() {
    if (!name.trim()) { setErr('Name your team.'); return }
    if (picks.length !== size) { setErr(`Pick exactly ${size} houseguests.`); return }
    setBusy(true)
    const { data } = await supabase.rpc('save_fantasy_team', { p_name: name.trim(), p_nums: picks })
    setBusy(false)
    if (data?.ok === false) { setErr(data.error || 'Could not save.'); return }
    setEditing(false); load()
  }

  if (!lb) return <p className="muted">Loading fantasy…</p>

  const drafting = editing || !myTeam
  const teams = lb.teams || []

  const Avatar = ({ h, size = 34 }) => (
    <div title={h?.name} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'var(--blush)', display: 'grid', placeItems: 'center', border: '1px solid var(--border)', flex: '0 0 auto' }}>
      {h?.photo_url ? <img src={h.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
        <span className="serif" style={{ color: 'var(--rose-deep)', fontSize: size * 0.42 }}>{(h?.name || '?').slice(0, 1)}</span>}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {/* Your team / draft */}
      {drafting ? (
        !lb.draft_open ? (
          <div className="card"><div className="muted">Drafting is closed right now — check back when Sarah reopens it.</div></div>
        ) : (
          <div className="card">
            <div className="serif" style={{ fontSize: 20 }}>{myTeam ? 'Edit your team' : 'Draft your team'}</div>
            <div className="muted" style={{ fontSize: 13, margin: '4px 0 12px' }}>Pick {size} houseguests. {picks.length}/{size} chosen.</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" maxLength={40} style={{ marginBottom: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {roster.map((h) => {
                const on = picks.includes(h.num)
                const out = (h.status || '').toLowerCase().includes('evict') || h.week_evicted
                return (
                  <button key={h.num} onClick={() => toggle(h.num)} disabled={busy} style={{
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--rose-deep)' : 'var(--border)'}`, background: on ? 'var(--blush)' : 'var(--card)',
                    borderRadius: 12, padding: '7px 9px', opacity: out ? 0.55 : 1,
                  }}>
                    <Avatar h={h} size={30} />
                    <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, color: 'var(--ink)' }}>{h.name}</span>
                  </button>
                )
              })}
            </div>
            {err && <div style={{ color: '#B3261E', fontSize: 13, marginTop: 10 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={save} disabled={busy} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }}>{myTeam ? 'Save changes' : 'Lock in my team'}</button>
              {myTeam && <button className="btn btn-outline" onClick={() => { setEditing(false); setErr('') }}>Cancel</button>}
            </div>
          </div>
        )
      ) : (
        <div className="card" style={{ background: 'var(--blush)', borderColor: 'var(--rose-deep)' }}>
          <div className="label">Your team</div>
          <div className="serif" style={{ fontSize: 22, margin: '4px 0 10px' }}>{myTeam.team_name}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(myTeam.picks || []).map((n) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card)', borderRadius: 999, padding: '4px 12px 4px 4px', border: '1px solid var(--border)' }}>
                <Avatar h={byNum[n]} size={28} /><span style={{ fontSize: 13, fontWeight: 600 }}>{byNum[n]?.name || `#${n}`}</span>
              </div>
            ))}
          </div>
          {lb.draft_open && <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>Edit team</button>}
        </div>
      )}

      {/* League */}
      <div>
        <div className="label" style={{ marginBottom: 10 }}>The league · {teams.length} team{teams.length === 1 ? '' : 's'}</div>
        {teams.length === 0 ? <p className="muted">No teams drafted yet — be the first.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {teams.map((t, i) => (
              <div className="card" key={i} style={{ borderColor: t.is_mine ? 'var(--rose-deep)' : 'var(--border)' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{t.team_name}{t.is_mine && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--blush)', color: 'var(--rose-deep)', padding: '2px 7px', borderRadius: 999 }}>YOU</span>}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(t.picks || []).map((n) => <Avatar key={n} h={byNum[n]} size={30} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
