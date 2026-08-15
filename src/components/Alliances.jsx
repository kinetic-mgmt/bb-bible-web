import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

const STATUS = {
  active: { fg: 'var(--sage)', label: 'Active' },
  crumbling: { fg: '#C9963F', label: 'Crumbling' },
  busted: { fg: '#B0757F', label: 'Busted' },
}
function statusKey(s) {
  const x = (s || '').toLowerCase()
  if (x.includes('crumbl')) return 'crumbling'
  if (x.includes('bust')) return 'busted'
  return 'active'
}
function memberNames(members) {
  if (!members) return []
  if (Array.isArray(members)) return members.map((m) => (typeof m === 'string' ? m : (m?.name || ''))).filter(Boolean)
  return []
}

// The alliances board — grouped Active → Crumbling → Busted, like the app.
export default function Alliances({ show }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    supabase.from('alliances').select('id,name,members,status,notes,member_tiers,sort').eq('show', show).order('sort', { nullsFirst: false })
      .then(({ data }) => setItems(data || []))
  }, [show])

  if (items === null) return <p className="muted">Loading alliances…</p>
  if (items.length === 0) return null

  const groups = { active: [], crumbling: [], busted: [] }
  for (const a of items) groups[statusKey(a.status)].push(a)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {['active', 'crumbling', 'busted'].map((k) => (groups[k].length === 0 ? null : (
        <div key={k}>
          <div className="label" style={{ color: STATUS[k].fg, marginBottom: 8 }}>{STATUS[k].label} · {groups[k].length}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {groups[k].map((a) => <AllianceCard key={a.id} a={a} k={k} />)}
          </div>
        </div>
      )))}
    </div>
  )
}

function AllianceCard({ a, k }) {
  const tiers = (a.member_tiers && typeof a.member_tiers === 'object') ? a.member_tiers : {}
  const members = memberNames(a.members)
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div className="serif" style={{ fontSize: 18, color: k === 'busted' ? 'var(--mauve)' : 'var(--ink)' }}>{a.name}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS[k].fg, border: `1px solid ${STATUS[k].fg}`, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{STATUS[k].label}</span>
      </div>
      {members.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
          {members.map((m) => {
            const tier = tiers[m]
            const main = (tier || '').toLowerCase() === 'main'
            return (
              <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--blush2)', borderRadius: 999, padding: '5px 11px', border: main ? '1px solid var(--rosegold)' : '1px solid transparent', fontSize: 12.5, fontWeight: main ? 700 : 500, color: 'var(--ink)' }}>
                {m}{tier && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--rosegold)' }}>{tier}</span>}
              </span>
            )
          })}
        </div>
      )}
      {a.notes && <div className="muted" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>{a.notes}</div>}
    </div>
  )
}
