import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

export default function Home() {
  const [shows, setShows] = useState(null)

  useEffect(() => {
    supabase.from('shows').select('slug,name,season_label,accent,visibility').order('sort')
      .then(({ data }) => setShows(data || []))
  }, [])

  return (
    <div style={{ paddingTop: 26 }}>
      <h1 className="serif" style={{ fontSize: 30, margin: '0 0 4px' }}>Pick a show</h1>
      <p className="muted" style={{ marginTop: 0 }}>Everything Sarah tracks, all in one place.</p>
      {shows === null ? (
        <p className="muted">Loading shows…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 18 }}>
          {shows.map((s) => (
            <Link key={s.slug} to={`/show/${s.slug}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ borderLeft: `4px solid ${s.accent || '#9E2B50'}` }}>
                <div className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>{s.name}</div>
                {s.season_label && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{s.season_label}</div>}
                <div style={{ marginTop: 12, color: 'var(--rose-deep)', fontSize: 13, fontWeight: 600 }}>Open ›</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
