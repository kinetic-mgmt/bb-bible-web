import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase.js'
import { PollCard, PredictionCard } from '../components/Vote.jsx'
import Chat from '../components/Chat.jsx'
import PowerRankings from '../components/PowerRankings.jsx'
import News from '../components/News.jsx'
import Fantasy from '../components/Fantasy.jsx'
import Feed from '../components/Feed.jsx'
import Alliances from '../components/Alliances.jsx'
import Comps from '../components/Comps.jsx'

// Big Brother is the original show — its data lives in its own tables
// (houseguests, weeks, chat room `lobby`). The other shows use the generic
// per-show tables (show_cast, show_episodes, `lobby:<slug>`). This page reads
// whichever applies so the website matches the app for every show.
export default function Show() {
  const { slug } = useParams()
  const isBB = slug === 'bigbrother'
  const chatRoom = isBB ? 'lobby' : `lobby:${slug}`

  const [show, setShow] = useState(null)
  const [cast, setCast] = useState([])
  const [recaps, setRecaps] = useState([])
  const [polls, setPolls] = useState([])
  const [predictions, setPredictions] = useState([])
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    let live = true
    async function load() {
      const castQ = isBB
        ? supabase.from('houseguests').select('id,num,name,occupation,hometown,photo_url,status,placement,week_evicted').eq('show', 'bigbrother').order('num')
        : supabase.from('show_cast').select('id,name,subtitle,tag,image_url,sort').eq('show', slug).order('sort')
      const recapQ = isBB
        ? supabase.from('weeks').select('week,dates,hoh,nominations_initial,veto,veto_ceremony,eviction_vote,twists,feed_notes').eq('show', 'bigbrother').order('week', { ascending: false })
        : supabase.from('show_episodes').select('episode_no,title,air_date,recap').eq('show', slug).eq('published', true).order('episode_no', { ascending: false })

      const [{ data: sh }, { data: c }, { data: r }, { data: pl }, { data: pr }] = await Promise.all([
        supabase.from('shows').select('slug,name,season_label,accent').eq('slug', slug).maybeSingle(),
        castQ,
        recapQ,
        supabase.from('polls').select('id,question,options,active,prize').eq('show', slug).eq('active', true),
        supabase.from('predictions').select('id,question,options,active,prize').eq('show', slug).eq('active', true),
      ])
      if (!live) return
      setShow(sh); setCast(c || []); setRecaps(r || []); setPolls(pl || []); setPredictions(pr || [])
    }
    load()
    return () => { live = false }
  }, [slug, isBB])

  const accent = show?.accent || '#9E2B50'
  const castLabel = isBB ? 'Houseguests' : 'Cast'
  const recapLabel = isBB ? 'The weeks' : 'Recaps'

  return (
    <div style={{ paddingTop: 22 }}>
      <Link to="/" className="muted" style={{ textDecoration: 'none', fontSize: 13 }}>‹ All shows</Link>
      <div style={{ marginTop: 10, borderRadius: 20, padding: '24px 24px', color: '#fff', overflow: 'hidden', background: `linear-gradient(120deg, ${accent}, var(--berry))`, boxShadow: '0 16px 38px -22px rgba(158,43,80,.55)' }}>
        <div className="serif" style={{ fontSize: 'clamp(30px, 7vw, 40px)', fontStyle: 'italic', color: '#fff', lineHeight: 1.05 }}>{show?.name || slug}</div>
        {show?.season_label && <div className="label" style={{ color: 'rgba(255,255,255,.88)', marginTop: 8 }}>{show.season_label}</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '18px 0', flexWrap: 'wrap' }}>
        {[['overview', 'Overview'], ['cast', `${castLabel}${cast.length ? ` (${cast.length})` : ''}`], ['recaps', `${recapLabel}${recaps.length ? ` (${recaps.length})` : ''}`], ['play', 'Play along'], ...(isBB ? [['fantasy', 'Fantasy'], ['feed', 'Feed']] : []), ['chat', 'Chat']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="btn" style={{
            padding: '8px 16px', fontSize: 13,
            background: tab === k ? 'linear-gradient(135deg, var(--rose), var(--rose-deep))' : 'transparent',
            color: tab === k ? '#fff' : 'var(--muted)', border: tab === k ? 'none' : '1px solid var(--border)', boxShadow: tab === k ? undefined : 'none',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: 26 }}>
          {isBB && recaps[0] && (
            <section>
              <div className="label" style={{ marginBottom: 10 }}>This week</div>
              <ThisWeek w={recaps[0]} />
            </section>
          )}
          {(polls.length + predictions.length) > 0 && (
            <section>
              <div className="label" style={{ marginBottom: 10 }}>Play along</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {polls.map((p) => <PollCard key={p.id} poll={p} />)}
                {predictions.map((p) => <PredictionCard key={p.id} pred={p} />)}
              </div>
            </section>
          )}
          <section>
            <div className="label" style={{ marginBottom: 10 }}>Power rankings</div>
            <PowerRankings show={slug} />
          </section>
          {isBB && (
            <section>
              <div className="label" style={{ marginBottom: 10 }}>Alliances</div>
              <Alliances show={slug} />
            </section>
          )}
          <section>
            <div className="label" style={{ marginBottom: 10 }}>The latest</div>
            <News show={slug} limit={6} />
          </section>
        </div>
      )}

      {tab === 'cast' && (
        cast.length === 0 ? <p className="muted">{isBB ? 'Houseguests' : 'Cast'} haven't been added yet.</p> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {cast.map((c) => {
            const name = c.name
            const subtitle = isBB ? c.occupation : (c.subtitle || c.tag)
            const img = isBB ? c.photo_url : c.image_url
            const chip = isBB ? bbStatusChip(c) : null
            return (
              <div className="card" key={c.id} style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--blush)', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: '0 0 auto', border: '1px solid var(--border)' }}>
                  {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                    <span className="serif" style={{ color: 'var(--rose-deep)', fontSize: 20 }}>{(name || '?').slice(0, 1)}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 17 }}>{name}</div>
                  {subtitle && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{subtitle}</div>}
                  {isBB && c.hometown && <div className="label" style={{ marginTop: 4, color: 'var(--mauve)' }}>{c.hometown}</div>}
                  {chip && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, background: chip.bg, color: chip.fg, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{chip.text}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'recaps' && (
        <div style={{ display: 'grid', gap: 22 }}>
          {isBB && (
            <section>
              <div className="label" style={{ marginBottom: 10 }}>Competitions</div>
              <Comps show={slug} />
            </section>
          )}
          <section>
            {isBB && <div className="label" style={{ marginBottom: 10 }}>Week by week</div>}
            {recaps.length === 0 ? <p className="muted">Nothing posted here yet.</p> :
              <div style={{ display: 'grid', gap: 12 }}>
                {isBB
                  ? recaps.map((w) => <WeekCard key={w.week} w={w} />)
                  : recaps.map((e) => (
                    <div className="card" key={e.episode_no}>
                      <div className="label">Episode {e.episode_no}{e.air_date ? ` · ${new Date(e.air_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</div>
                      {e.title && <div className="serif" style={{ fontSize: 21, margin: '5px 0 6px' }}>{e.title}</div>}
                      {e.recap?.overview && <div style={{ color: 'var(--ink)', marginTop: 4, lineHeight: 1.6, fontSize: 14.5 }}>{e.recap.overview}</div>}
                    </div>
                  ))}
              </div>}
          </section>
        </div>
      )}

      {tab === 'play' && (
        (polls.length + predictions.length) === 0 ? <p className="muted">Nothing live to play right now — check back when Sarah opens a poll or prediction.</p> :
        <div style={{ display: 'grid', gap: 12 }}>
          {polls.map((p) => <PollCard key={p.id} poll={p} />)}
          {predictions.map((p) => <PredictionCard key={p.id} pred={p} />)}
        </div>
      )}

      {tab === 'fantasy' && <Fantasy />}

      {tab === 'feed' && <Feed show={slug} />}

      {tab === 'chat' && <Chat room={chatRoom} />}
    </div>
  )
}

function bbStatusChip(hg) {
  const s = (hg.status || '').toLowerCase()
  if (s.includes('evict') || hg.week_evicted) return { text: hg.week_evicted ? `Evicted · wk ${hg.week_evicted}` : 'Evicted', bg: 'var(--blush)', fg: 'var(--rose-deep)' }
  if (s.includes('jury')) return { text: 'Jury', bg: 'var(--blush)', fg: 'var(--rose-deep)' }
  if (s === 'hoh') return { text: 'HOH', bg: '#EAF6EF', fg: '#2e7d5b' }
  if (hg.placement) return { text: `Placed #${hg.placement}`, bg: 'var(--blush)', fg: 'var(--rose-deep)' }
  return null
}

function fmt(v) {
  if (v == null || v === '') return null
  if (Array.isArray(v)) return v.join(' · ')
  if (typeof v === 'object') return Object.values(v).filter(Boolean).join(' · ')
  return String(v)
}

// The current week's status at a glance — the "basic stuff" (HOH, noms, POV, have-nots).
function ThisWeek({ w }) {
  const items = [
    ['HOH', fmt(w.hoh)],
    ['Nominations', fmt(w.nominations_initial)],
    ['POV', fmt(w.veto)],
    ['Have-nots', fmt(w.have_nots)],
  ]
  return (
    <div className="card" style={{ background: 'var(--blush)', borderColor: 'var(--rose-deep)' }}>
      <div className="serif" style={{ fontSize: 22 }}>Week {w.week}</div>
      {w.dates && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{w.dates}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginTop: 14 }}>
        {items.map(([k, v]) => (
          <div key={k}>
            <div className="label" style={{ color: 'var(--rose-deep)' }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 4, lineHeight: 1.4 }}>{v || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekCard({ w }) {
  const rows = [
    ['HOH', fmt(w.hoh)],
    ['Nominations', fmt(w.nominations_initial)],
    ['Veto', fmt(w.veto)],
    ['Veto ceremony', fmt(w.veto_ceremony)],
    ['Eviction', fmt(w.eviction_vote)],
    ['Twists', fmt(w.twists)],
  ].filter(([, v]) => v)
  return (
    <div className="card">
      <div className="label">Week {w.week}{w.dates ? ` · ${w.dates}` : ''}</div>
      {rows.length === 0 && !w.feed_notes && <div className="muted" style={{ marginTop: 6 }}>Recap coming soon.</div>}
      <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.45 }}>
            <span className="label" style={{ minWidth: 116, flex: '0 0 auto', color: 'var(--mauve)' }}>{k}</span>
            <span style={{ color: 'var(--ink)' }}>{v}</span>
          </div>
        ))}
      </div>
      {w.feed_notes && <div style={{ color: 'var(--ink)', marginTop: 12, lineHeight: 1.6, fontSize: 14.5, borderTop: '1px solid var(--border)', paddingTop: 10 }}>{fmt(w.feed_notes)}</div>}
    </div>
  )
}
