import { supabase } from '../supabase.js'

// Upload a cast headshot to the same public bucket the app uses
// (chat-media/img/<uid>/<ts>.<ext>) and return its public URL.
export async function uploadPhoto(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')
  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const ext = rawExt === 'png' ? 'png' : 'jpg'
  const path = `img/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('chat-media').upload(path, file, {
    contentType: file.type || (ext === 'png' ? 'image/png' : 'image/jpeg'),
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl
}

// Send a push to fans — same edge function the app editor calls.
export async function sendPush({ title, message, audience = 'all', data }) {
  const res = await supabase.functions.invoke('send-push', {
    body: { title, message, audience, ...(data ? { data } : {}) },
  })
  const d = res.data
  if (d && d.ok === true) return null
  return (d && d.error) || 'Could not send. Please try again.'
}

// The words each show uses (mirrors the app's show_vocab), so the console reads
// right per show — "voted out" for Survivor, "banished" for Traitors, etc.
export function vocab(slug) {
  switch (slug) {
    case 'survivor':
      return { contestants: 'castaways', out: 'voted out', immunity: 'immunity', hasGroups: true, group: 'Tribe' }
    case 'traitors':
      return { contestants: 'players', out: 'banished', immunity: 'shield', hasGroups: false }
    case 'dragrace':
    case 'allstars':
      return { contestants: 'queens', out: 'sashayed away', immunity: 'top of the week', hasGroups: false }
    case 'dwts':
      return { contestants: 'couples', out: 'eliminated', immunity: 'top of the leaderboard', hasGroups: false }
    default:
      return { contestants: 'houseguests', out: 'evicted', immunity: 'safe', hasGroups: false }
  }
}

// Ready-made prediction questions per show, with sensible default points.
// Sarah taps one, we prefill it; she can still edit before opening the round.
export function questionTemplates(slug) {
  const common = [{ q: 'Custom question', pts: 20 }]
  switch (slug) {
    case 'survivor':
      return [{ q: 'Who gets voted out?', pts: 50 }, { q: 'Who wins immunity?', pts: 25 }, { q: 'Who wins reward?', pts: 20 }, ...common]
    case 'traitors':
      return [{ q: 'Who gets banished at the Roundtable?', pts: 40 }, { q: 'Who gets murdered tonight?', pts: 40 }, { q: 'Will the Traitors recruit tonight?', pts: 20 }, ...common]
    case 'dragrace':
    case 'allstars':
      return [{ q: 'Who wins the challenge?', pts: 30 }, { q: 'Who sashays away?', pts: 50 }, { q: 'Who lip syncs?', pts: 25 }, ...common]
    case 'dwts':
      return [{ q: 'Who goes home?', pts: 50 }, { q: 'Who tops the leaderboard?', pts: 25 }, { q: 'Who lands in the bottom two?', pts: 30 }, ...common]
    default:
      return [{ q: 'Who gets evicted?', pts: 50 }, { q: 'Who wins HOH?', pts: 30 }, { q: 'Who wins the veto?', pts: 25 }, ...common]
  }
}
