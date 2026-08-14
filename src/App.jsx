import { useEffect, useState } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './supabase.js'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Show from './pages/Show.jsx'
import Talkers from './pages/Talkers.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><span className="muted">Loading…</span></div>
  }
  if (!session) return <Login />

  return (
    <div>
      <Header email={session.user?.email} />
      <div className="wrap" style={{ paddingBottom: 40 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/show/:slug" element={<Show />} />
          <Route path="/talkers" element={<Talkers />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <div className="powered">Powered by Kinetic Management</div>
      </div>
    </div>
  )
}

function Header({ email }) {
  const nav = useNavigate()
  const logout = async () => { await supabase.auth.signOut({ scope: 'local' }); nav('/') }
  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 16, height: 62 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span className="serif" style={{ fontStyle: 'italic', fontSize: 22 }}>Sarah's <span style={{ color: 'var(--rose-deep)' }}>BB Bible</span></span>
        </Link>
        <nav style={{ display: 'flex', gap: 18, marginLeft: 12 }}>
          <Link to="/" className="muted" style={{ textDecoration: 'none' }}>Shows</Link>
          <Link to="/talkers" className="muted" style={{ textDecoration: 'none' }}>Sarah's Talkers</Link>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>{email}</span>
          <button className="btn-outline btn" style={{ padding: '7px 14px', fontSize: 13 }} onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  )
}
