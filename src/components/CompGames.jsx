import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

const TYPES = ['HOH', 'Veto', 'Blockbuster']

// A checklist of comp games by type, crossed off as they're played (Discord
// Suggestion #3) — so fans can theorize what's coming. Admins manage it inline.
export default function CompGames({ show }) {
  const [games, setGames] = useState(null)
  const [admin, setAdmin] = useState(false)
  const [adding, setAdding] = useState({})

  async function load() {
    const [{ data: g }, { data: a }] = await Promise.all([
      supabase.from('comp_games').select('id,comp_type,name,played,played_week,sort').eq('show', show).order('sort', { nullsFirst: false }).order('name'),
      supabase.rpc('am_i_admin'),
    ])
    setGames(g || [])
    setAdmin(a === true)
  }
  useEffect(() => { load() }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePlayed(g) {
    await supabase.from('comp_games').update({ played: !g.played }).eq('id', g.id)
    load()
  }
  async function addGame(type) {
    const name = (adding[type] || '').trim()
    if (!name) return
    await supabase.from('comp_games').insert({ show, comp_type: type, name })
    setAdding((s) => ({ ...s, [type]: '' }))
    load()
  }
  async function del(id) {
    await supabase.from('comp_games').delete().eq('id', id)
    load()
  }

  if (games === null) return <p className="muted">Loading…</p>

  const byType = {}
  for (const g of games) (byType[g.comp_type] || (byType[g.comp_type] = [])).push(g)
  const extra = Object.keys(byType).filter((t) => !TYPES.includes(t))
  const orderedTypes = admin ? [...TYPES, ...extra] : [...TYPES.filter((t) => byType[t]?.length), ...extra]

  if (games.length === 0 && !admin) return <p className="muted">No comp games listed yet.</p>

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {orderedTypes.map((type) => (
        <div key={type}>
          <div className="label" style={{ marginBottom: 8 }}>{type}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(byType[type] || []).map((g) => (
              <span key={g.id} onClick={admin ? () => togglePlayed(g) : undefined} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
                border: `1px solid ${g.played ? 'var(--border)' : 'var(--rose-deep)'}`,
                background: g.played ? 'var(--card)' : 'var(--blush)',
                color: g.played ? 'var(--muted)' : 'var(--ink)',
                textDecoration: g.played ? 'line-through' : 'none', cursor: admin ? 'pointer' : 'default', fontSize: 13, fontWeight: 600,
              }}>
                {g.played ? '✓ ' : ''}{g.name}
                {admin && <button onClick={(e) => { e.stopPropagation(); del(g.id) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>}
              </span>
            ))}
            {(byType[type] || []).length === 0 && !admin && <span className="muted" style={{ fontSize: 13 }}>—</span>}
          </div>
          {admin && (
            <form onSubmit={(e) => { e.preventDefault(); addGame(type) }} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input className="input" value={adding[type] || ''} onChange={(e) => setAdding((s) => ({ ...s, [type]: e.target.value }))} placeholder={`Add a ${type} game…`} style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
              <button className="btn" type="submit" style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', fontSize: 13, padding: '8px 16px' }}>Add</button>
            </form>
          )}
        </div>
      ))}
      {admin && <div className="muted" style={{ fontSize: 12 }}>Tap a game to cross it off (played). Fans see the crossed-off list.</div>}
    </div>
  )
}
