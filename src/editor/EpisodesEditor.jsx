import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { sendPush } from './lib.js'

// Per-show weekly recaps — the same show_episodes table the app reads. Keeps the
// essentials (number, title, air date, the recap overview) and a publish toggle
// so a draft stays hidden until Sarah's ready. The app's deeper scoring fields
// are left untouched here.
export default function EpisodesEditor({ show, showName }) {
  const [eps, setEps] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('show_episodes').select('id,episode_no,title,air_date,overview,recap,published')
      .eq('show', show).order('episode_no', { ascending: false })
    setEps(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePublish(e) {
    await supabase.from('show_episodes').update({ published: !e.published, updated_at: new Date().toISOString() }).eq('id', e.id)
    if (!e.published) await sendPush({ title: `${showName} recap`, message: `Episode ${e.episode_no} is up — tap to read.`, data: { target: 'recaps' } })
    await load()
  }

  const nextNo = eps.length ? Math.max(...eps.map((e) => e.episode_no || 0)) + 1 : 1

  return (
    <div>
      <button className="btn" style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', marginBottom: 16 }} onClick={() => setEditing({ episode_no: nextNo })}>+ Add an episode</button>
      {loading ? <p className="muted">Loading…</p> : eps.length === 0 ? <p className="muted">No episodes yet.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {eps.map((e) => (
            <div className="card" key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="label" style={{ color: 'var(--mauve)' }}>Episode {e.episode_no}{e.air_date ? ` · ${new Date(e.air_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</div>
                {e.title && <div className="serif" style={{ fontSize: 17, marginTop: 2 }}>{e.title}</div>}
                <span className="label" style={{ marginTop: 5, display: 'inline-block', color: e.published ? 'var(--sage)' : 'var(--rose-deep)' }}>{e.published ? 'Published' : 'Draft'}</span>
              </div>
              <button className="btn btn-outline" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => setEditing(e)}>Edit</button>
              <button className="btn btn-outline" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => togglePublish(e)}>{e.published ? 'Unpublish' : 'Publish'}</button>
            </div>
          ))}
        </div>
      )}
      {editing && <EpForm show={show} showName={showName} row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function EpForm({ show, showName, row, onClose, onSaved }) {
  const [no, setNo] = useState(row.episode_no?.toString() || '')
  const [title, setTitle] = useState(row.title || '')
  const [date, setDate] = useState(row.air_date ? row.air_date.slice(0, 10) : '')
  const [overview, setOverview] = useState(row.overview || row.recap?.overview || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!no.trim()) { setErr('Episode number is required.'); return }
    setBusy(true); setErr('')
    const payload = {
      show, episode_no: parseInt(no.trim(), 10), title: title.trim() || null,
      air_date: date || null, overview: overview.trim() || null,
      recap: { ...(row.recap || {}), overview: overview.trim() || null },
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('show_episodes').upsert(payload, { onConflict: 'show,episode_no' })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="card" style={sheet} onClick={(e) => e.stopPropagation()}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 12 }}>{row.id ? 'Edit' : 'Add'} episode · {showName}</div>
        <Row>
          <Field label="Episode #" v={no} on={(e) => setNo(e.target.value)} />
          <div style={{ marginBottom: 10, flex: 1 }}>
            <div className="label" style={{ marginBottom: 5 }}>Air date</div>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
          </div>
        </Row>
        <Field label="Title" v={title} on={(e) => setTitle(e.target.value)} />
        <div style={{ marginBottom: 10 }}>
          <div className="label" style={{ marginBottom: 5 }}>Recap overview</div>
          <textarea className="input" rows={5} value={overview} onChange={(e) => setOverview(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
        </div>
        {err && <div style={{ color: '#B3261E', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>New episodes save as a draft. Publish from the list to push it to fans.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

const Field = ({ label, v, on }) => (
  <div style={{ marginBottom: 10, flex: 1 }}>
    <div className="label" style={{ marginBottom: 5 }}>{label}</div>
    <input className="input" value={v} onChange={on} style={{ width: '100%' }} />
  </div>
)
const Row = ({ children }) => <div style={{ display: 'flex', gap: 12 }}>{children}</div>
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 16 }
const sheet = { maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto' }
