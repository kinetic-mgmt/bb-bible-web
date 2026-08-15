import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

function statusStyle(s) {
  const x = (s || '').toLowerCase()
  if (x.includes('crumbl')) return { fg: '#C9963F', label: 'Crumbling' }
  if (x.includes('bust')) return { fg: '#B0757F', label: 'Busted' }
  return { fg: 'var(--sage)', label: 'Active' }
}

function memberList(members) {
  if (!members) return ''
  if (Array.isArray(members)) return members.map((m) => (typeof m === 'string' ? m : (m?.name || ''))).filter(Boolean).join(', ')
  return String(members)
}

// The alliances board — who's aligned, and whether it's holding.
export default function Alliances({ show }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    supabase.from('alliances').select('id,name,members,status,notes,sort').eq('show', show).order('sort', { nullsFirst: false })
      .then(({ data }) => setItems(data || []))
  }, [show])

  if (items === null) return <p className="muted">Loading alliances…</p>
  if (items.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((a) => {
        const st = statusStyle(a.status)
        const members = memberList(a.members)
        return (
          <div className="card" key={a.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <div className="serif" style={{ fontSize: 18 }}>{a.name}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: st.fg, border: `1px solid ${st.fg}`, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{st.label}</span>
            </div>
            {members && <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{members}</div>}
            {a.notes && <div style={{ fontSize: 13.5, marginTop: 6, color: 'var(--ink)', lineHeight: 1.5 }}>{a.notes}</div>}
          </div>
        )
      })}
    </div>
  )
}
