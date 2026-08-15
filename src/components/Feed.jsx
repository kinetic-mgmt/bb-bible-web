import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

// The house feed — timestamped live updates (feed_updates), newest first.
export default function Feed({ show }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    supabase.from('feed_updates').select('id,week,body,logged_at,created_at').eq('show', show)
      .order('logged_at', { ascending: false, nullsFirst: false }).limit(120)
      .then(({ data }) => setItems(data || []))
  }, [show])

  if (items === null) return <p className="muted">Loading the feed…</p>
  if (items.length === 0) return <p className="muted">No live updates yet.</p>

  return (
    <div style={{ display: 'grid' }}>
      {items.map((f) => {
        const when = f.logged_at || f.created_at
        const d = when ? new Date(when) : null
        return (
          <div key={f.id} style={{ display: 'flex', gap: 12, padding: '12px 2px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: '0 0 auto', width: 62 }}>
              <div className="label" style={{ color: 'var(--rose-deep)' }}>{d ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : (f.week != null ? `Wk ${f.week}` : '')}</div>
            </div>
            <div style={{ flex: 1, color: 'var(--ink)', fontSize: 14.5, lineHeight: 1.55 }}>{f.body}</div>
          </div>
        )
      })}
    </div>
  )
}
