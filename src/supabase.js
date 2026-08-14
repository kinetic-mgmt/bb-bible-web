import { createClient } from '@supabase/supabase-js'

// Same backend as the mobile app — one account, one source of truth.
const url = 'https://mnuhcigcfakypdiycagw.supabase.co'
const publishableKey = 'sb_publishable_YXPk8tgQGUBgAMKwZ2VeUw_uxrBd-xT'

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
