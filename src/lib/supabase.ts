import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Always a valid client (env vars must be set in production)
// The client is lazily created so build-time works with empty env
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY)
  }
  return _client
}

// Backward compat - existing code imports this directly
export const supabase = getSupabase()

// Server-side service role client (server-only, has elevated privileges)
export function getServiceRoleClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY
  if (!SUPABASE_URL || !key || key === 'placeholder-anon-key') return null
  return createClient(SUPABASE_URL, key)
}

export const IS_DEMO = false