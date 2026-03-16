import { createClient } from '@supabase/supabase-js'

// Uses service role key — bypasses RLS. Server-side and Inngest handlers only.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
