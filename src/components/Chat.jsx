import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'

const GOLD = '#B98F43'

// Live lobby chat for a room (e.g. "lobby:bigbrother"). Loads recent history,
// then streams new posts over Supabase realtime. Same backend as the app.
export default function Chat({ room }) {
  const [me, setMe] = useState(null)      // chat_me() result
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [username, setUsername] = useState('')
  const [joinErr, setJoinErr] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  async function loadMe() {
    const { data } = await supabase.rpc('chat_me')
    setMe(data || { joined: false })
  }
  useEffect(() => { loadMe() }, [])

  useEffect(() => {
    let active = true
    // newest 80, then flip to chronological — a busy room (BB `lobby` has 1000s)
    // must show the latest, not the oldest.
    supabase.from('chat_messages').select('*').eq('room', room).eq('deleted', false)
      .order('created_at', { ascending: false }).limit(80)
      .then(({ data }) => { if (active) setMsgs((data || []).slice().reverse()) })

    const ch = supabase.channel(`web-chat:${room}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room=eq.${room}` },
        (payload) => setMsgs((m) => (m.some((x) => x.id === payload.new.id) ? m : [...m, payload.new])))
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [room])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function join(e) {
    e.preventDefault()
    setJoinErr('')
    const name = username.trim()
    if (name.length < 2) { setJoinErr('Pick a name (2+ characters).'); return }
    const { data, error } = await supabase.rpc('chat_join', { p_username: name, p_role: null, p_show: null })
    if (error || data?.ok !== true) { setJoinErr(data?.error || 'That name is taken — try another.'); return }
    await loadMe()
  }

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setSending(true)
    const { data } = await supabase.rpc('chat_send', {
      p_room: room, p_body: body, p_parent: null, p_quote_of: null, p_gif_url: null, p_voice_url: null, p_voice_ms: null,
    })
    if (data?.ok) setText('')
    setSending(false)
  }

  if (!me) return <p className="muted" style={{ paddingTop: 12 }}>Loading chat…</p>

  if (!me.joined) {
    return (
      <form onSubmit={join} style={{ maxWidth: 380, margin: '20px auto 0', textAlign: 'center' }}>
        <div style={{ fontSize: 30 }}>💬</div>
        <div className="serif" style={{ fontSize: 22, margin: '6px 0' }}>Join the chat</div>
        <p className="muted" style={{ marginTop: 0 }}>Pick a display name — this is how everyone sees you.</p>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your name" maxLength={24} style={{ textAlign: 'center' }} />
        {joinErr && <div style={{ color: '#B3261E', fontSize: 13, marginTop: 8 }}>{joinErr}</div>}
        <button className="btn" type="submit" style={{ marginTop: 12, background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }}>Join</button>
      </form>
    )
  }

  if (me.banned) return <p className="muted" style={{ paddingTop: 16, textAlign: 'center' }}>You're not able to chat right now.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'min(62vh, 560px)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--card)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {msgs.length === 0 && <p className="muted" style={{ margin: 'auto' }}>Be the first to say something 👋</p>}
        {msgs.map((m) => <Message key={m.id} m={m} />)}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border)' }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Chat as ${me.username}…`} maxLength={500} style={{ flex: 1 }} />
        <button className="btn" type="submit" disabled={sending || !text.trim()} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', opacity: (sending || !text.trim()) ? .6 : 1 }}>Send</button>
      </form>
    </div>
  )
}

function Message({ m }) {
  const vip = m.author_is_vip
  return (
    <div style={{ fontSize: 14, lineHeight: 1.45 }}>
      <span style={{ fontWeight: 700, color: vip ? GOLD : 'var(--rose-deep)' }}>{m.author_name || 'fan'}</span>
      {m.author_badge && <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--blush)', color: 'var(--rose-deep)', padding: '1px 6px', borderRadius: 999 }}>{m.author_badge}</span>}
      <span style={{ color: 'var(--ink)' }}>  {m.body}</span>
      {m.gif_url && <div style={{ marginTop: 4 }}><img src={m.gif_url} alt="" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 10 }} /></div>}
    </div>
  )
}
