import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

function typeStyle(t) {
  const s = (t || '').toLowerCase()
  if (s.includes('rumor')) return { bg: 'var(--blush)', fg: 'var(--rose-deep)', label: 'Rumor' }
  if (s.includes('confirm') || s.includes('fact')) return { bg: '#EAF6EF', fg: '#2e7d5b', label: 'Confirmed' }
  return { bg: 'var(--blush2)', fg: 'var(--rose-deep)', label: t || 'News' }
}

// The show's news feed (facts / rumors / articles) — same `news` table as the app.
export default function News({ show, limit = 20 }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    supabase.from('news').select('id,date,type,source,headline,link').eq('show', show).order('date', { ascending: false }).limit(limit)
      .then(({ data }) => setItems(data || []))
  }, [show, limit])

  if (items === null) return <p className="muted">Loading news…</p>
  if (items.length === 0) return <p className="muted">No news yet.</p>

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((n) => {
        const ts = typeStyle(n.type)
        const inner = (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: ts.bg, color: ts.fg, padding: '2px 8px', borderRadius: 999 }}>{ts.label}</span>
              {n.source && <span className="label" style={{ color: 'var(--mauve)' }}>{n.source}</span>}
              {n.date && <span className="muted" style={{ fontSize: 12 }}>{new Date(n.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
              {n.link && <span style={{ marginLeft: 'auto', color: 'var(--rose-deep)', fontSize: 12, fontWeight: 700 }}>Read ›</span>}
            </div>
            <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>{n.headline}</div>
          </>
        )
        return n.link
          ? <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="card" style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>
          : <div key={n.id} className="card">{inner}</div>
      })}
    </div>
  )
}
