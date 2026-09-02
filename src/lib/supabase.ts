import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  ''
).trim()

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  ''
).trim()

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export const isSupabaseConfigured = isHttpUrl(supabaseUrl) && supabaseAnonKey.length > 0

let client: SupabaseClient | null = null

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null

  client ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}

