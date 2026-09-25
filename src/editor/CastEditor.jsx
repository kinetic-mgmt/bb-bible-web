import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'
import { uploadPhoto, vocab } from './lib.js'

const STATUSES = ['active', 'safe', 'out', 'evicted', 'banished', 'murdered', 'winner']

// Add, edit, photo, and status for a show's cast — the same admin_add_cast /
// admin_update_cast / show_cast_list RPCs the app uses, so it's one source of
// truth. Photos upload straight from Sarah's computer.
export default function CastEditor({ show, showName }) {
  const v = vocab(show)
  const [cast, setCast] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // row or {} for new
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('show_cast_list', { p_show: show })
    setCast(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(row) {
    if (!confirm(`Remove ${row.name}?`)) return
    await supabase.rpc('admin_delete_cast', { p_id: row.id })
    await load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div className="label">{v.contestants} · {cast.length}</div>
        <button className="btn" style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', padding: '8px 16px', fontSize: 13 }}
          onClick={() => setEditing({})}>+ Add {v.contestants.replace(/s$/, '')}</button>
      </div>
      {msg && <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{msg}</div>}
      {loading ? <p className="muted">Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {cast.map((c) => (
            <div className="card" key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar url={c.image_url} name={c.name} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="serif" style={{ fontSize: 16 }}>{c.name}</div>
                {c.subtitle && <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{c.subtitle}</div>}
                <div className="label" style={{ marginTop: 5, color: 'var(--mauve)' }}>{c.status || 'active'}{c.tag ? ` · ${c.tag}` : ''}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setEditing(c)}>Edit</button>
                <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12, color: 'var(--rose-deep)' }} onClick={() => remove(c)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <CastForm show={show} showName={showName} row={editing.id ? editing : null} nextSort={cast.length}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function Avatar({ url, name, size = 52 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'var(--blush)', display: 'grid', placeItems: 'center', flex: '0 0 auto', border: '1px solid var(--border)' }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
        <span className="serif" style={{ color: 'var(--rose-deep)', fontSize: size * 0.36 }}>{(name || '?').slice(0, 1)}</span>}
    </div>
  )
}

function CastForm({ show, showName, row, nextSort, onClose, onSaved }) {
  const [f, setF] = useState({
    name: row?.name || '', subtitle: row?.subtitle || '', tag: row?.tag || '',
    image_url: row?.image_url || '', age: row?.age?.toString() || '', hometown: row?.hometown || '',
    occupation: row?.occupation || '', bio: row?.bio || '', tiktok: row?.tiktok || '',
    instagram: row?.instagram || '', x: row?.x || '', status: row?.status || 'active',
  })
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function pick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setUploading(true)
    try {
      const url = await uploadPhoto(file)
      setF((s) => ({ ...s, image_url: url }))
    } catch (x) { setErr(x.message || 'Upload failed.') }
    finally { setUploading(false) }
  }

  async function save() {
    if (!f.name.trim()) { setErr('Name is required.'); return }
    setBusy(true); setErr('')
    const age = f.age.trim() ? parseInt(f.age.trim(), 10) : null
    const params = {
      p_name: f.name.trim(), p_subtitle: f.subtitle.trim(), p_tag: f.tag.trim(),
      p_image_url: f.image_url.trim(), p_age: age, p_hometown: f.hometown.trim(),
      p_occupation: f.occupation.trim(), p_bio: f.bio.trim(), p_tiktok: f.tiktok.trim(),
      p_instagram: f.instagram.trim(), p_x: f.x.trim(), p_status: f.status,
    }
    const { data } = row
      ? await supabase.rpc('admin_update_cast', { p_id: row.id, ...params })
      : await supabase.rpc('admin_add_cast', { p_show: show, p_sort: nextSort, ...params })
    setBusy(false)
    if (data && data.ok === false) { setErr(data.error || 'Could not save.'); return }
    onSaved()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="card" style={sheet} onClick={(e) => e.stopPropagation()}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 4 }}>{row ? 'Edit' : 'Add'} · {showName}</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '10px 0 16px' }}>
          <Avatar url={f.image_url} name={f.name} size={64} />
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
            <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: 13 }} disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? 'Uploading…' : (f.image_url ? 'Change photo' : 'Upload a photo')}
            </button>
            <div className="muted" style={{ fontSize: 11, marginTop: 5 }}>Straight from your computer. JPG or PNG.</div>
          </div>
        </div>
        <Field label="Name" v={f.name} on={set('name')} />
        <Row>
          <Field label="Subtitle / role" v={f.subtitle} on={set('subtitle')} />
          <Field label="Tag (e.g. age or tribe)" v={f.tag} on={set('tag')} />
        </Row>
        <Row>
          <Field label="Age" v={f.age} on={set('age')} />
          <Field label="Hometown" v={f.hometown} on={set('hometown')} />
        </Row>
        <Field label="Occupation" v={f.occupation} on={set('occupation')} />
        <div style={{ marginBottom: 10 }}>
          <div className="label" style={{ marginBottom: 5 }}>Bio</div>
          <textarea className="input" rows={3} value={f.bio} onChange={set('bio')} style={{ width: '100%', resize: 'vertical' }} />
        </div>
        <Row>
          <Field label="TikTok" v={f.tiktok} on={set('tiktok')} />
          <Field label="Instagram" v={f.instagram} on={set('instagram')} />
        </Row>
        <div style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 5 }}>Status</div>
          <select className="input" value={f.status} onChange={set('status')} style={{ width: '100%' }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {err && <div style={{ color: '#B3261E', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || uploading} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
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
const sheet = { maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto' }
