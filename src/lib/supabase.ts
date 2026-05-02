import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// For use in client components — uses the publishable key
export const supabaseBrowser = createClient(supabaseUrl, supabasePublishableKey)

// For use in API routes and server actions — uses the secret key
export const supabaseServer = createClient(supabaseUrl, supabaseSecretKey)
