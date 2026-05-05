import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

export const supabaseBrowser = createClient(supabaseUrl, supabasePublishableKey)

// Service-role client for API routes: bypasses RLS, never runs in the browser.
export const supabaseServer = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
