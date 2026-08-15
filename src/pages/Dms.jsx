import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase.js'

// 1:1 direct messages — same backend as the app. Inbox + conversation + reply,
// plus "Message the team" (help desk). Light polling keeps threads fresh.
export default function Dms() {
  const [threads, setThreads] = useState(null)
  const [active, setActive] = useState(null) // thread id
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  async function loadThreads() {
    const { data } = await supabase.rpc('dm_threads_list')
    setThreads(data || [])
  }
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 10000); return () => clearInterval(t) }, [])

  async function loadMsgs(thread) {
    const { data } = await supabase.rpc('dm_messages_list', { p_thread: thread })
    setMsgs(data || [])
  }
  useEffect(() => {
    if (!active) return
    loadMsgs(active)
    const t = setInterval(() => loadMsgs(active), 5000)
    return () => clearInterval(t)
  }, [active])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function messageTeam() {
    const { data: hd } = await supabase.rpc('dm_help_desk')
    if (!hd) return
    const { data } = await supabase.rpc('dm_start', { p_target: hd })
    if (data?.ok) { await loadThreads(); setActive(data.thread) }
  }

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !active) return
    setBusy(true)
    const { data } = await supabase.rpc('dm_send', { p_thread: active, p_body: body })
    if (data?.ok) { setText(''); await loadMsgs(active); loadThreads() }
    setBusy(false)
  }

  const activeThread = threads?.find((t) => t.thread === active)

  // ---- Conversation view ----
  if (active) {
    return (
      <div style={{ maxWidth: 640, margin: '20px auto 0' }}>
        <button onClick={() => { setActive(null); loadThreads() }} className="muted" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>‹ All messages</button>
        <div className="serif" style={{ fontSize: 22, margin: '6px 0 12px' }}>
          {activeThread?.is_help_desk ? 'The team' : (activeThread?.other_name || 'Conversation')}
          {activeThread?.other_handle && <span className="muted" style={{ fontSize: 14, marginLeft: 8 }}>@{activeThread.other_handle}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'min(60vh, 520px)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--card)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.length === 0 && <p className="muted" style={{ margin: 'auto' }}>Say hi 👋</p>}
            {msgs.map((m) => (
              <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                <div style={{
                  padding: '9px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.4,
                  background: m.mine ? 'linear-gradient(135deg, var(--rose), var(--rose-deep))' : 'var(--blush)',
                  color: m.mine ? '#fff' : 'var(--ink)',
                }}>{m.body}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border)' }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" maxLength={1000} style={{ flex: 1 }} />
            <button className="btn" type="submit" disabled={busy || !text.trim()} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', opacity: (busy || !text.trim()) ? .6 : 1 }}>Send</button>
          </form>
        </div>
      </div>
    )
  }

  // ---- Inbox view ----
  return (
    <div style={{ maxWidth: 640, margin: '24px auto 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 className="serif" style={{ fontSize: 30, margin: 0 }}>Messages</h1>
        <button onClick={messageTeam} className="btn" style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', fontSize: 13, padding: '9px 16px' }}>Message the team</button>
      </div>

      {threads === null ? <p className="muted" style={{ marginTop: 18 }}>Loading…</p>
        : threads.length === 0 ? (
          <p className="muted" style={{ marginTop: 18 }}>No messages yet. Tap “Message the team” if you need a hand, or reply to a DM someone sends you.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
            {threads.map((t) => (
              <button key={t.thread} onClick={() => { setActive(t.thread); setMsgs([]) }} className="card" style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', flex: '0 0 auto', background: 'var(--blush)', display: 'grid', placeItems: 'center', color: 'var(--rose-deep)', fontWeight: 700 }}>
                  {t.is_help_desk ? '★' : (t.other_name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                    {t.is_help_desk ? 'The team' : t.other_name}
                    {t.is_help_desk && <span style={{ fontSize: 10, background: 'var(--blush)', color: 'var(--rose-deep)', padding: '1px 6px', borderRadius: 999 }}>SUPPORT</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.last_mine ? 'You: ' : ''}{t.last_body || '…'}
                  </div>
                </div>
                {t.unread > 0 && <span style={{ background: 'var(--rose-deep)', color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 999, display: 'grid', placeItems: 'center', padding: '0 6px' }}>{t.unread}</span>}
              </button>
            ))}
          </div>
        )}
    </div>
  )
}
