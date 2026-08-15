import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

// Competition results — HOH / Veto / etc. by week, with the winner.
export default function Comps({ show }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    supabase.from('comps').select('id,week,type,title,winner,description,sort').eq('show', show)
      .order('week', { ascending: false, nullsFirst: false }).order('sort', { nullsFirst: false })
      .then(({ data }) => setItems(data || []))
  }, [show])

  if (items === null) return <p className="muted">Loading comps…</p>
  if (items.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((c) => (
        <div className="card" key={c.id}>
          <div className="label">{c.week != null ? `Week ${c.week}` : 'Comp'}{c.type ? ` · ${c.type}` : ''}</div>
          {c.title && <div className="serif" style={{ fontSize: 18, margin: '4px 0 2px' }}>{c.title}</div>}
          {c.winner && <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>🏆 <b>{c.winner}</b></div>}
          {c.description && <div className="muted" style={{ fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>{c.description}</div>}
        </div>
      ))}
    </div>
  )
}
