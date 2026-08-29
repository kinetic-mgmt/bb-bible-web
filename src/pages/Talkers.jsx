import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

// Must stay identical to the app's ladder (lib/screens/talkers_screen.dart) so a
// fan sees the SAME rank on the web and in the app (Ticket #17). Points-based,
// 12 tiers, never resets.
const TIERS = [
  { name: 'Lurker', at: 0, perk: 'Just here for the tea 👀' },
  { name: 'Newbie', at: 10, perk: 'Your name starts standing out' },
  { name: 'Fan', at: 50, perk: 'Your name lights up in chat' },
  { name: 'Superfan', at: 150, perk: 'Tier badge + a Superfan-only lounge' },
  { name: 'Regular', at: 500, perk: 'Custom gift animation' },
  { name: 'Insider', at: 1250, perk: 'Top Gifters board + monthly shoutout' },
  { name: 'VIP', at: 3000, perk: 'Exclusive emotes + priority DM replies' },
  { name: 'Ride or Die', at: 6000, perk: 'Double giveaway entries + early drops' },
  { name: 'Diehard', at: 12000, perk: 'Guest-spot consideration' },
  { name: 'Legend', at: 25000, perk: 'A free month of all-access' },
  { name: 'Icon', at: 50000, perk: 'Permanent Wall of Fame' },
  { name: 'Hall of Famer', at: 100000, perk: 'Real-world VIP perks · forever a legend' },
]

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`

export default function Talkers() {
  const [s, setS] = useState(null)
  useEffect(() => { supabase.rpc('my_talker_status').then(({ data }) => setS(data || { ok: false })) }, [])

  if (!s) return <p className="muted" style={{ paddingTop: 26 }}>Loading…</p>

  const points = s.points ?? 0
  const tierIdx = s.tier_idx ?? 1
  const thisAt = s.this_level_at_points ?? 0
  const nextAt = s.next_level_at_points
  const toNextTier = s.points_to_next_tier
  const prog = nextAt && nextAt > thisAt ? Math.min(1, Math.max(0, (points - thisAt) / (nextAt - thisAt))) : 1
  const maxed = tierIdx >= TIERS.length

  return (
    <div style={{ paddingTop: 26 }}>
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--rose-deep), #8A4A5E)', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: .85, letterSpacing: 1 }}>
          <span>SARAH'S TALKER</span><span>{fmt(points)} pts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
          <span className="serif" style={{ fontSize: 32 }}>{s.tier || 'Lurker'}</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,.25)', borderRadius: 999, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ width: `${prog * 100}%`, height: '100%', background: 'var(--rosegold-hi)' }} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>
          {maxed ? "Maxed out — Hall of Famer. 👑" : s.next_tier && toNextTier != null ? `${fmt(toNextTier)} pts to ${s.next_tier}` : 'Keep gifting to level up'}
        </div>
      </div>

      <div className="label" style={{ marginTop: 22 }}>The ladder</div>
      <p className="muted" style={{ marginTop: 4 }}>Earn points every day — gifting coins moves you up fastest, and chatting, voting and referring friends all count. It never resets. The long game.</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
        {TIERS.map((t, i) => {
          const idx = i + 1
          const reached = tierIdx >= idx
          const current = tierIdx === idx
          return (
            <div className="card" key={t.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderColor: current ? 'var(--rose-deep)' : 'var(--border)', background: current ? 'var(--blush)' : 'var(--card)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: '0 0 auto', background: reached ? 'var(--rose-deep)' : 'var(--bg)', color: reached ? '#fff' : 'var(--muted)', border: `1px solid ${reached ? 'var(--rose-deep)' : 'var(--border)'}`, fontSize: 11 }}>
                {reached ? '✓' : fmt(t.at)}
              </div>
              <div>
                <div><span className="serif" style={{ fontSize: 17 }}>{t.name}</span> <span className="muted" style={{ fontSize: 11 }}>{fmt(t.at)}+ pts</span>{current && <span style={{ marginLeft: 8, background: 'var(--rose-deep)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 999 }}>YOU</span>}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{t.perk}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
