import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { vocab } from '../editor/lib.js'
import CastEditor from '../editor/CastEditor.jsx'
import LeagueConsole from '../editor/LeagueConsole.jsx'
import EpisodesEditor from '../editor/EpisodesEditor.jsx'
import ReachEditor from '../editor/ReachEditor.jsx'

// Sarah's desk on the web — the same admin tools as the app, so she can run the
// shows from her computer. Everything here calls the same admin RPCs, gated
// server-side by is_admin(), so a non-admin who lands here can't change a thing.
export default function Editor() {
  const [isAdmin, setIsAdmin] = useState(undefined)
  const [shows, setShows] = useState([])
  const [show, setShow] = useState('')
  const [section, setSection] = useState('cast')

  useEffect(() => {
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(data === true))
    supabase.from('shows').select('slug,name').order('sort', { nullsFirst: false }).then(({ data }) => {
      const rows = Array.isArray(data) ? data : []
      setShows(rows)
      if (rows.length && !show) setShow(rows[0].slug)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isAdmin === undefined) return <p className="muted" style={{ marginTop: 40 }}>Loading…</p>
  if (!isAdmin) return <Navigate to="/" replace />

  const showName = shows.find((s) => s.slug === show)?.name || show
  const v = vocab(show)
  const SECTIONS = [
    ['cast', `Cast · ${v.contestants}`],
    ['league', 'Prediction League'],
    ['episodes', 'Episodes'],
    ['reach', 'Reach your people'],
  ]

  return (
    <div style={{ paddingTop: 22 }}>
      <div className="serif" style={{ fontSize: 'clamp(28px,6vw,36px)', fontStyle: 'italic' }}>Sarah's desk</div>
      <p className="muted" style={{ marginTop: 4 }}>Run your shows from here. Everything updates the app and website for your people right away.</p>

      <div style={{ margin: '18px 0 6px' }}>
        <div className="label" style={{ marginBottom: 8 }}>Show</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {shows.map((s) => (
            <button key={s.slug} className="btn" onClick={() => setShow(s.slug)} style={{
              padding: '7px 14px', fontSize: 13,
              background: show === s.slug ? 'linear-gradient(135deg, var(--rose), var(--rose-deep))' : 'transparent',
              color: show === s.slug ? '#fff' : 'var(--muted)', border: show === s.slug ? 'none' : '1px solid var(--border)',
            }}>{s.name}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        {SECTIONS.map(([k, l]) => (
          <button key={k} className="btn" onClick={() => setSection(k)} style={{
            padding: '8px 15px', fontSize: 13,
            background: section === k ? 'var(--rose-deep)' : 'transparent',
            color: section === k ? '#fff' : 'var(--muted)', border: section === k ? 'none' : '1px solid var(--border)',
          }}>{l}</button>
        ))}
      </div>

      {show && (
        <div key={show + section}>
          {section === 'cast' && <CastEditor show={show} showName={showName} />}
          {section === 'league' && <LeagueConsole show={show} showName={showName} />}
          {section === 'episodes' && <EpisodesEditor show={show} showName={showName} />}
          {section === 'reach' && <ReachEditor show={show} showName={showName} />}
        </div>
      )}
    </div>
  )
}
