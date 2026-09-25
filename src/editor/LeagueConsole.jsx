import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { questionTemplates, sendPush, vocab } from './lib.js'

const POINTS = [50, 40, 30, 25, 20, 10]

// Sarah's live Prediction League desk: open tonight's round, lock it when the
// moment hits, grade it after, and push the results — no scheduling, all live.
// Same admin_open_round / admin_lock_round / admin_reopen_round /
// admin_grade_round RPCs as the app.
export default function LeagueConsole({ show, showName }) {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [grading, setGrading] = useState(null) // round being graded
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('prediction_rounds').select().eq('show', show).order('created_at', { ascending: false }).limit(30)
    setRounds(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  async function lock(r) { await supabase.rpc('admin_lock_round', { p_round: r.id }); await load() }
  async function reopen(r) { await supabase.rpc('admin_reopen_round', { p_round: r.id }); await load() }

  const openRound = rounds.find((r) => r.status === 'open')

  return (
    <div>
      {msg && <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{msg}</div>}
      {!openRound && !building && (
        <button className="btn" style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', marginBottom: 16 }} onClick={() => setBuilding(true)}>
          + Open tonight's round
        </button>
      )}
      {building && <RoundBuilder show={show} showName={showName} onClose={() => setBuilding(false)} onOpened={() => { setBuilding(false); load() }} />}

      {loading ? <p className="muted">Loading rounds…</p> : rounds.length === 0 ? (
        <p className="muted">No rounds yet. Open one when the episode's about to start.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rounds.map((r) => (
            <div className="card" key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 17 }}>{r.title || `Episode ${r.episode || ''}`.trim()}</div>
                <div className="label" style={{ marginTop: 4, color: statusColor(r.status) }}>{statusLabel(r.status)}{r.episode ? ` · Ep ${r.episode}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {r.status === 'open' && <button className="btn btn-outline" style={btn} onClick={() => lock(r)}>Lock</button>}
                {r.status === 'locked' && <button className="btn btn-outline" style={btn} onClick={() => reopen(r)}>Reopen</button>}
                {r.status !== 'graded' && <button className="btn" style={{ ...btn, background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }} onClick={() => setGrading(r)}>Grade</button>}
                {r.status === 'graded' && <span className="label" style={{ color: 'var(--sage)' }}>Done ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {grading && <GradeSheet round={grading} show={show} showName={showName} onClose={() => setGrading(null)} onGraded={() => { setGrading(null); load() }} />}
    </div>
  )
}

function statusLabel(s) { return s === 'open' ? 'Open — fans picking' : s === 'locked' ? 'Locked' : s === 'graded' ? 'Graded' : s }
function statusColor(s) { return s === 'open' ? 'var(--sage)' : s === 'graded' ? 'var(--mauve)' : 'var(--rose-deep)' }
const btn = { padding: '6px 12px', fontSize: 13 }

function RoundBuilder({ show, showName, onClose, onOpened }) {
  const v = vocab(show)
  const [episode, setEpisode] = useState('')
  const [title, setTitle] = useState('')
  const [cast, setCast] = useState([])
  const [questions, setQuestions] = useState([])
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.rpc('show_cast_list', { p_show: show }).then(({ data }) => setCast(Array.isArray(data) ? data : []))
  }, [show])

  async function open() {
    if (questions.length === 0) { setErr('Add at least one question.'); return }
    setBusy(true); setErr('')
    const ep = episode.trim() ? parseInt(episode.trim(), 10) : null
    const payload = questions.map((q) => ({ question: q.question, options: q.options, points: q.points }))
    const { data } = await supabase.rpc('admin_open_round', {
      p_show: show, p_episode: ep, p_title: title.trim() || `Episode ${ep || ''}`.trim(), p_questions: payload,
    })
    setBusy(false)
    if (!data || data.ok === false) { setErr((data && data.error) || 'Could not open the round.'); return }
    onOpened()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="card" style={sheet} onClick={(e) => e.stopPropagation()}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 12 }}>Open tonight's round · {showName}</div>
        <Row>
          <Field label="Episode #" v={episode} on={(e) => setEpisode(e.target.value)} />
          <Field label="Title (optional)" v={title} on={(e) => setTitle(e.target.value)} />
        </Row>
        <div className="label" style={{ margin: '10px 0 8px' }}>Questions</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {questions.map((q, i) => (
            <div className="card" key={i} style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{q.question}</span>
                <span className="label" style={{ color: 'var(--rose-deep)' }}>{q.points} pts</span>
                <button className="btn btn-outline" style={{ padding: '3px 9px', fontSize: 12 }} onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>✕</button>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{q.options.join(' · ')}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-outline" style={{ marginTop: 10, fontSize: 13 }} onClick={() => setAdding(true)}>+ Add a question</button>
        {adding && <QuestionSheet show={show} cast={cast} vocab={v} onClose={() => setAdding(false)} onAdd={(q) => { setQuestions([...questions, q]); setAdding(false) }} />}
        {err && <div style={{ color: '#B3261E', fontSize: 13, margin: '10px 0' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }} onClick={open}>{busy ? 'Opening…' : 'Open round'}</button>
        </div>
      </div>
    </div>
  )
}

function QuestionSheet({ show, cast, vocab, onClose, onAdd }) {
  const templates = questionTemplates(show)
  const [question, setQuestion] = useState('')
  const [points, setPoints] = useState(50)
  const [mode, setMode] = useState('cast') // 'cast' | 'type'
  const [picked, setPicked] = useState([])
  const [typed, setTyped] = useState('')

  function useTemplate(t) { setQuestion(t.q === 'Custom question' ? '' : t.q); setPoints(t.pts) }
  function toggle(name) { setPicked(picked.includes(name) ? picked.filter((n) => n !== name) : [...picked, name]) }

  function add() {
    const options = mode === 'cast' ? picked : typed.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!question.trim() || options.length < 2) return
    onAdd({ question: question.trim(), options, points })
  }
  const canAdd = question.trim() && (mode === 'cast' ? picked.length >= 2 : typed.split('\n').filter((s) => s.trim()).length >= 2)

  return (
    <div style={overlay} onClick={onClose}>
      <div className="card" style={sheet} onClick={(e) => e.stopPropagation()}>
        <div className="serif" style={{ fontSize: 20, marginBottom: 10 }}>Add a question</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {templates.map((t, i) => <button key={i} className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => useTemplate(t)}>{t.q}</button>)}
        </div>
        <Field label="Question" v={question} on={(e) => setQuestion(e.target.value)} />
        <div className="label" style={{ margin: '6px 0' }}>Points</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {POINTS.map((p) => <button key={p} className="btn" style={{ padding: '5px 12px', fontSize: 13, background: points === p ? 'var(--rose-deep)' : 'transparent', color: points === p ? '#fff' : 'var(--muted)', border: points === p ? 'none' : '1px solid var(--border)' }} onClick={() => setPoints(p)}>{p}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button className="btn btn-outline" style={{ fontSize: 12, flex: 1, background: mode === 'cast' ? 'var(--blush)' : 'transparent' }} onClick={() => setMode('cast')}>From the {vocab.contestants}</button>
          <button className="btn btn-outline" style={{ fontSize: 12, flex: 1, background: mode === 'type' ? 'var(--blush)' : 'transparent' }} onClick={() => setMode('type')}>Type the options</button>
        </div>
        {mode === 'cast' ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 200, overflow: 'auto' }}>
            {cast.map((c) => <button key={c.id} className="btn btn-outline" style={{ padding: '5px 10px', fontSize: 12, background: picked.includes(c.name) ? 'var(--rose-deep)' : 'transparent', color: picked.includes(c.name) ? '#fff' : 'var(--ink)' }} onClick={() => toggle(c.name)}>{c.name}</button>)}
            {cast.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No cast loaded — type the options instead.</span>}
          </div>
        ) : (
          <textarea className="input" rows={4} placeholder="One option per line" value={typed} onChange={(e) => setTyped(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={!canAdd} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }} onClick={add}>Add</button>
        </div>
      </div>
    </div>
  )
}

function GradeSheet({ round, show, showName, onClose, onGraded }) {
  const [qs, setQs] = useState([])
  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('predictions').select('id,question,options,points').eq('round_id', round.id).order('created_at')
      .then(({ data }) => setQs(Array.isArray(data) ? data : []))
  }, [round.id])

  async function grade() {
    if (Object.keys(answers).length < qs.length) { setErr('Mark the correct answer for every question.'); return }
    setBusy(true); setErr('')
    const { data } = await supabase.rpc('admin_grade_round', { p_round: round.id, p_answers: answers })
    if (data && data.ok === false) { setBusy(false); setErr(data.error || 'Could not grade.'); return }
    await sendPush({ title: `${showName} results are in`, message: 'Tonight\'s round is graded — see how you did.', data: { target: 'play' } })
    setBusy(false)
    onGraded()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="card" style={sheet} onClick={(e) => e.stopPropagation()}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 4 }}>Grade the round</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Tap the correct answer for each. Grading updates points, streaks, and pushes the results.</div>
        <div style={{ display: 'grid', gap: 14 }}>
          {qs.map((q) => (
            <div key={q.id}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{q.question} <span className="label" style={{ color: 'var(--rose-deep)' }}>{q.points} pts</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(q.options || []).map((o, i) => (
                  <button key={i} className="btn btn-outline" style={{ padding: '5px 11px', fontSize: 13, background: answers[q.id] === i ? 'var(--sage)' : 'transparent', color: answers[q.id] === i ? '#fff' : 'var(--ink)' }} onClick={() => setAnswers({ ...answers, [q.id]: i })}>{o}</button>
                ))}
              </div>
            </div>
          ))}
          {qs.length === 0 && <p className="muted">No questions on this round.</p>}
        </div>
        {err && <div style={{ color: '#B3261E', fontSize: 13, margin: '12px 0' }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || qs.length === 0} style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff' }} onClick={grade}>{busy ? 'Grading…' : 'Grade & push results'}</button>
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
