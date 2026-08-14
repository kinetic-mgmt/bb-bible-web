import { useEffect, useState } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './supabase.js'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Show from './pages/Show.jsx'
import Talkers from './pages/Talkers.jsx'
import Gift from './pages/Gift.jsx'
import Redeem from './pages/Redeem.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [access, setAccess] = useState(undefined)    // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setAccess(undefined); return }
    supabase.rpc('my_access').then(({ data }) => setAccess(data || { all_access: false, shows: [] }))
  }, [session])

  if (session === undefined) return <Splash />
  if (!session) return <Login />
  if (access === undefined) return <Splash />

  const hasPass = !!(access.all_access || (Array.isArray(access.shows) && access.shows.length > 0))

  return (
    <div>
      <Header email={session.user?.email} hasPass={hasPass} />
      <div className="wrap" style={{ paddingBottom: 40 }}>
        <Routes>
          {hasPass && <Route path="/" element={<Home />} />}
          {hasPass && <Route path="/show/:slug" element={<Show />} />}
          {hasPass && <Route path="/talkers" element={<Talkers />} />}
          {!hasPass && <Route path="/" element={<Paywall email={session.user?.email} />} />}
          <Route path="/gift" element={<Gift />} />
          <Route path="/redeem" element={<Redeem />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <div className="powered">Powered by Kinetic Management</div>
      </div>
    </div>
  )
}

function Splash() {
  return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><span className="muted">Loading…</span></div>
}

function Header({ email, hasPass }) {
  const nav = useNavigate()
  const logout = async () => { await supabase.auth.signOut({ scope: 'local' }); nav('/') }
  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 16, height: 62 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span className="serif" style={{ fontStyle: 'italic', fontSize: 22 }}>Sarah's <span style={{ color: 'var(--rose-deep)' }}>BB Bible</span></span>
        </Link>
        <nav style={{ display: 'flex', gap: 18, marginLeft: 12 }}>
          {hasPass ? (
            <>
              <Link to="/" className="muted" style={{ textDecoration: 'none' }}>Shows</Link>
              <Link to="/talkers" className="muted" style={{ textDecoration: 'none' }}>Sarah's Talkers</Link>
              <Link to="/gift" className="muted" style={{ textDecoration: 'none' }}>Gift a Pass</Link>
            </>
          ) : (
            <>
              <Link to="/redeem" className="muted" style={{ textDecoration: 'none' }}>Redeem a code</Link>
              <Link to="/gift" className="muted" style={{ textDecoration: 'none' }}>Gift a Pass</Link>
            </>
          )}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>{email}</span>
          <button className="btn-outline btn" style={{ padding: '7px 14px', fontSize: 13 }} onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  )
}

// Free-plan wall: a season pass is required to use the web companion. Redeem or buy to unlock.
function Paywall({ email }) {
  return (
    <div style={{ maxWidth: 520, margin: '48px auto 0', textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <h1 className="serif" style={{ fontSize: 32, margin: '10px 0 6px' }}>This is for pass holders</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        The web companion — every show's recaps, play-along, fantasy and rankings — is included with any season pass.
        Redeem a gift someone sent you, or grab a pass to unlock everything.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
        <Link to="/redeem" className="btn" style={{ background: 'linear-gradient(135deg, var(--rose), var(--rose-deep))', color: '#fff', textDecoration: 'none' }}>Redeem a gift code</Link>
        <Link to="/gift" className="btn btn-outline" style={{ textDecoration: 'none' }}>Get a season pass</Link>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 22 }}>
        Already bought in the app? Your pass is tied to your account — make sure you're logged in here with the same one{email ? <> (<b>{email}</b>)</> : ''}.
      </p>
    </div>
  )
}
