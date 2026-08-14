import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

const TIERS = [
  { name: 'Lurker', start: 0, perk: 'Just here for the tea' },
  { name: 'Fan', start: 25, perk: 'Your name lights up in chat' },
  { name: 'Superfan', start: 75, perk: 'Tier badge + a Superfan-only lounge' },
  { name: 'VIP', start: 150, perk: 'Custom gift animation · Top Gifters board · monthly shoutout' },
  { name: 'Ride or Die', start: 250, perk: 'Priority DM replies · exclusive emotes · double giveaway entries' },
  { name: 'Legend', start: 375, perk: 'A free season pass · early drops · guest-spot consideration' },
  { name: 'Icon', start: 500, perk: 'Permanent Wall of Fame · real-world VIP perks' },
]

export default function Talkers() {
  const [s, setS] = useState(null)
  useEffect(() => { supabase.rpc('my_talker_status').then(({ data }) => setS(data || { ok: false })) }, [])

  if (!s) return <p className="muted" style={{ paddingTop: 26 }}>Loading…</p>

  const level = s.level ?? 0
  const tierIdx = s.tier_idx ?? 1
  const coins = s.coins_gifted ?? 0
  const thisAt = s.this_level_at_coins ?? 0
  const nextAt = s.next_level_at_coins
  const prog = nextAt && nextAt > thisAt ? Math.min(1, Math.max(0, (coins - thisAt) / (nextAt - thisAt))) : 1

  return (
    <div style={{ paddingTop: 26 }}>
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--rose-deep), #8A4A5E)', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: .85, letterSpacing: 1 }}>
          <span>SARAH'S TALKER</span><span>🪙 {coins} gifted</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
          <span className="serif" style={{ fontSize: 32 }}>{s.tier || 'Lurker'}</span>
          <span style={{ opacity: .85, fontWeight: 700 }}>Level {level}</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,.25)', borderRadius: 999, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ width: `${prog * 100}%`, height: '100%', background: 'var(--rosegold-hi)' }} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>
          {level >= 500 ? "Maxed out. You're an Icon. 👑" : s.next_tier && s.coins_to_next_tier != null ? `${s.coins_to_next_tier} coins to ${s.next_tier}` : 'Keep gifting to level up'}
        </div>
      </div>

      <div className="label" style={{ marginTop: 22 }}>The ladder</div>
      <p className="muted" style={{ marginTop: 4 }}>Every coin you gift moves you up. It never resets. The more you give, the more you get.</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
        {TIERS.map((t, i) => {
          const idx = i + 1
          const reached = tierIdx >= idx
          const current = tierIdx === idx
          return (
            <div className="card" key={t.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', borderColor: current ? 'var(--rose-deep)' : 'var(--border)', background: current ? 'var(--blush)' : 'var(--card)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: '0 0 auto', background: reached ? 'var(--rose-deep)' : 'var(--bg)', color: reached ? '#fff' : 'var(--muted)', border: `1px solid ${reached ? 'var(--rose-deep)' : 'var(--border)'}`, fontSize: 12 }}>
                {reached ? '✓' : t.start}
              </div>
              <div>
                <div><span className="serif" style={{ fontSize: 17 }}>{t.name}</span> <span className="muted" style={{ fontSize: 11 }}>LV {t.start}+</span>{current && <span style={{ marginLeft: 8, background: 'var(--rose-deep)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 999 }}>YOU</span>}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{t.perk}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
