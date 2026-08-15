import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase.js'

export default function Home() {
  const [shows, setShows] = useState(null)

  useEffect(() => {
    // only launched (public) shows appear — Sarah's in-app Launch button flips
    // the other shows to public, and they show up here automatically.
    supabase.from('shows').select('slug,name,season_label,accent,visibility').eq('visibility', 'public').order('sort')
      .then(({ data }) => setShows(data || []))
  }, [])

  return (
    <div style={{ paddingTop: 30 }}>
      {/* Hero — mirrors the app cover: logo, script/serif wordmark */}
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <img src="/sarah-logo.png" alt="" width="76" height="76" style={{ borderRadius: 20, boxShadow: '0 14px 30px -16px rgba(158,43,80,.5)' }} />
        <div className="serif" style={{ fontStyle: 'italic', fontSize: 26, color: 'var(--rose-deep)', marginTop: 12 }}>Sarah's</div>
        <div className="serif" style={{
          fontStyle: 'italic', fontSize: 'clamp(44px, 11vw, 64px)', lineHeight: 1, marginTop: 2,
          background: 'linear-gradient(120deg, var(--rose-deep), var(--berry))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>BB Bible</div>
        <p className="muted" style={{ marginTop: 14, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
          Sarah's here for you all season — tracking the whole house so you never miss a comp, a nom, or a blindside.
        </p>
      </div>

      <div className="label" style={{ textAlign: 'center', marginBottom: 14 }}>Pick a show</div>

      {shows === null ? (
        <p className="muted" style={{ textAlign: 'center' }}>Loading shows…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
          {shows.map((s) => (
            <Link key={s.slug} to={`/show/${s.slug}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ position: 'relative', overflow: 'hidden', paddingLeft: 22 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: `linear-gradient(180deg, ${s.accent || 'var(--rose-deep)'}, var(--berry))` }} />
                <div className="serif" style={{ fontSize: 24, color: 'var(--ink)' }}>{s.name}</div>
                {s.season_label && <div className="label" style={{ marginTop: 6, color: 'var(--mauve)' }}>{s.season_label}</div>}
                <div style={{ marginTop: 14, color: 'var(--rose-deep)', fontSize: 13, fontWeight: 700 }}>Open ›</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
