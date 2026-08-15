import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { PollCard, PredictionCard } from '../components/Vote.jsx'
import Chat from '../components/Chat.jsx'

export default function Show() {
  const { slug } = useParams()
  const [show, setShow] = useState(null)
  const [cast, setCast] = useState([])
  const [episodes, setEpisodes] = useState([])
  const [polls, setPolls] = useState([])
  const [predictions, setPredictions] = useState([])
  const [tab, setTab] = useState('cast')

  useEffect(() => {
    let live = true
    async function load() {
      const [{ data: sh }, { data: c }, { data: ep }, { data: pl }, { data: pr }] = await Promise.all([
        supabase.from('shows').select('slug,name,season_label,accent').eq('slug', slug).maybeSingle(),
        supabase.from('show_cast').select('id,name,subtitle,tag,image_url,sort').eq('show', slug).order('sort'),
        supabase.from('show_episodes').select('episode_no,title,air_date,recap').eq('show', slug).eq('published', true).order('episode_no', { ascending: false }),
        supabase.from('polls').select('id,question,options,active,prize').eq('show', slug).eq('active', true),
        supabase.from('predictions').select('id,question,options,active,prize').eq('show', slug).eq('active', true),
      ])
      if (!live) return
      setShow(sh); setCast(c || []); setEpisodes(ep || []); setPolls(pl || []); setPredictions(pr || [])
    }
    load()
    return () => { live = false }
  }, [slug])

  const accent = show?.accent || '#9E2B50'

  return (
    <div style={{ paddingTop: 22 }}>
      <Link to="/" className="muted" style={{ textDecoration: 'none', fontSize: 13 }}>‹ All shows</Link>
      <div style={{ marginTop: 10, borderRadius: 20, padding: '24px 24px', color: '#fff', overflow: 'hidden', background: `linear-gradient(120deg, ${accent}, var(--berry))`, boxShadow: '0 16px 38px -22px rgba(158,43,80,.55)' }}>
        <div className="serif" style={{ fontSize: 'clamp(30px, 7vw, 40px)', fontStyle: 'italic', color: '#fff', lineHeight: 1.05 }}>{show?.name || slug}</div>
        {show?.season_label && <div className="label" style={{ color: 'rgba(255,255,255,.88)', marginTop: 8 }}>{show.season_label}</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '18px 0' }}>
        {[['cast', `Cast${cast.length ? ` (${cast.length})` : ''}`], ['recaps', `Recaps${episodes.length ? ` (${episodes.length})` : ''}`], ['play', 'Play along'], ['chat', 'Chat']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="btn" style={{
            padding: '8px 16px', fontSize: 13,
            background: tab === k ? 'linear-gradient(135deg, var(--rose), var(--rose-deep))' : 'transparent',
            color: tab === k ? '#fff' : 'var(--muted)', border: tab === k ? 'none' : '1px solid var(--border)',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'cast' && (
        cast.length === 0 ? <p className="muted">Cast hasn't been added yet.</p> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
          {cast.map((c) => (
            <div className="card" key={c.id} style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--blush)', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: '0 0 auto', border: '1px solid var(--border)' }}>
                {c.image_url ? <img src={c.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                  <span className="serif" style={{ color: 'var(--rose-deep)', fontSize: 20 }}>{(c.name || '?').slice(0, 1)}</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 17 }}>{c.name}</div>
                {(c.subtitle || c.tag) && <div className="label" style={{ marginTop: 3, color: 'var(--mauve)' }}>{c.subtitle || c.tag}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'recaps' && (
        episodes.length === 0 ? <p className="muted">No recaps published yet.</p> :
        <div style={{ display: 'grid', gap: 12 }}>
          {episodes.map((e) => (
            <div className="card" key={e.episode_no}>
              <div className="label">Episode {e.episode_no}{e.air_date ? ` · ${new Date(e.air_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</div>
              {e.title && <div className="serif" style={{ fontSize: 21, margin: '5px 0 6px' }}>{e.title}</div>}
              {e.recap?.overview && <div style={{ color: 'var(--ink)', marginTop: 4, lineHeight: 1.6, fontSize: 14.5 }}>{e.recap.overview}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'play' && (
        (polls.length + predictions.length) === 0 ? <p className="muted">Nothing live to play right now.</p> :
        <div style={{ display: 'grid', gap: 12 }}>
          {polls.map((p) => <PollCard key={p.id} poll={p} />)}
          {predictions.map((p) => <PredictionCard key={p.id} pred={p} />)}
        </div>
      )}

      {tab === 'chat' && <Chat room={`lobby:${slug}`} />}
    </div>
  )
}
