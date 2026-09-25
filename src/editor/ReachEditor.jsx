import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { sendPush } from './lib.js'

// Reach your people from the computer: fire a push, drop a news item, or post a
// feed update. Push uses the same send-push edge function as the app; news and
// feed_updates write the same tables (scoped to this show).
export default function ReachEditor({ show, showName }) {
  const [tab, setTab] = useState('push')
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['push', 'Send a notification'], ['news', 'News'], ['feed', 'Feed update']].map(([k, l]) => (
          <button key={k} className="btn" onClick={() => setTab(k)} style={{ padding: '7px 14px', fontSize: 13, background: tab === k ? 'var(--rose-deep)' : 'transparent', color: tab === k ? '#fff' : 'var(--muted)', border: tab === k ? 'none' : '1px solid var(--border)' }}>{l}</button>
        ))}
      </div>
      {tab === 'push' && <PushForm showName={showName} />}
      {tab === 'news' && <NewsForm show={show} showName={showName} />}
      {tab === 'feed' && <FeedForm show={show} showName={showName} />}
    </div>
  )
}

function PushForm({ showName }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function send() {
    if (!title.trim() || !message.trim()) { setNote('Add a title and a message.'); return }
    if (!confirm(`Buzz ${audience === 'all' ? 'everyone' : audience} with "${title.trim()}"?`)) return
    setBusy(true); setNote('')
    const err = await sendPush({ title: title.trim(), message: message.trim(), audience })
    setBusy(false)
    if (err) { setNote(err); return }
    setNote('Sent ✓'); setTitle(''); setMessage('')
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <Field label="Title" v={title} on={(e) => setTitle(e.target.value)} />
      <div style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 5 }}>Message</div>
        <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div className="label" style={{ marginBottom: 5 }}>Who gets it</div>
        <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)} style={{ width: '100%' }}>
          <option value="all">Everyone</option>
          <option value="paid">Pass holders</option>
          <option value="super">Superfans</option>
        </select>
      </div>
      {note && <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{note}</div>}
      <button className="btn" disabled={busy} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }} onClick={send}>{busy ? 'Sending…' : 'Send notification'}</button>
    </div>
  )
}

function NewsForm({ show, showName }) {
  const [items, setItems] = useState([])
  const [headline, setHeadline] = useState('')
  const [type, setType] = useState('news')
  const [source, setSource] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function load() {
    const { data } = await supabase.from('news').select('id,date,type,source,headline').eq('show', show).order('created_at', { ascending: false }).limit(15)
    setItems(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!headline.trim()) { setNote('Add a headline.'); return }
    setBusy(true); setNote('')
    const { error } = await supabase.from('news').insert({
      show, date: new Date().toISOString().slice(0, 10), type, source: source.trim() || null, headline: headline.trim(), link: link.trim() || null,
    })
    if (!error) await sendPush({ title: type === 'rumor' ? 'New rumor' : 'News drop', message: headline.trim(), data: { target: 'news' } })
    setBusy(false)
    if (error) { setNote(error.message); return }
    setHeadline(''); setSource(''); setLink(''); await load()
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 5 }}>Headline</div>
        <textarea className="input" rows={2} value={headline} onChange={(e) => setHeadline(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      <Row>
        <div style={{ marginBottom: 10, flex: 1 }}>
          <div className="label" style={{ marginBottom: 5 }}>Type</div>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%' }}>
            <option value="news">Confirmed news</option>
            <option value="rumor">Rumor</option>
          </select>
        </div>
        <Field label="Source (optional)" v={source} on={(e) => setSource(e.target.value)} />
      </Row>
      <Field label="Link (optional)" v={link} on={(e) => setLink(e.target.value)} />
      {note && <div className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>{note}</div>}
      <button className="btn" disabled={busy} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', marginBottom: 18 }} onClick={add}>{busy ? 'Posting…' : 'Post & notify'}</button>
      <div className="label" style={{ marginBottom: 8 }}>Recent for {showName}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((n) => (
          <div className="card" key={n.id} style={{ padding: '10px 13px' }}>
            <span className="label" style={{ color: n.type === 'rumor' ? 'var(--mauve)' : 'var(--rose-deep)' }}>{n.type}{n.source ? ` · ${n.source}` : ''}</span>
            <div style={{ fontSize: 14, marginTop: 3 }}>{n.headline}</div>
          </div>
        ))}
        {items.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Nothing yet.</span>}
      </div>
    </div>
  )
}

function FeedForm({ show, showName }) {
  const [items, setItems] = useState([])
  const [week, setWeek] = useState('1')
  const [body, setBody] = useState('')
  const [notify, setNotify] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function load() {
    const { data } = await supabase.from('feed_updates').select('id,week,body,logged_at').eq('show', show).order('logged_at', { ascending: false }).limit(15)
    setItems(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!body.trim()) { setNote('Write the update.'); return }
    setBusy(true); setNote('')
    const { error } = await supabase.from('feed_updates').insert({ show, week: parseInt(week, 10) || 1, body: body.trim() })
    if (!error && notify) await sendPush({ title: 'New from the feed', message: body.trim().slice(0, 90), data: { target: 'feed' } })
    setBusy(false)
    if (error) { setNote(error.message); return }
    setBody(''); await load()
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Row>
        <Field label="Week" v={week} on={(e) => setWeek(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-end', marginBottom: 14, fontSize: 13, color: 'var(--ink)' }}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify fans
        </label>
      </Row>
      <div style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 5 }}>Update</div>
        <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      {note && <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{note}</div>}
      <button className="btn" disabled={busy} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', marginBottom: 18 }} onClick={add}>{busy ? 'Posting…' : 'Post update'}</button>
      <div className="label" style={{ marginBottom: 8 }}>Recent for {showName}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((u) => (
          <div className="card" key={u.id} style={{ padding: '10px 13px' }}>
            <span className="label" style={{ color: 'var(--mauve)' }}>Week {u.week}</span>
            <div style={{ fontSize: 14, marginTop: 3 }}>{u.body}</div>
          </div>
        ))}
        {items.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Nothing yet.</span>}
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
