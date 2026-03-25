import { createClient } from '@supabase/supabase-js'

// Get from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If credentials exist, create client; otherwise return null
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseKey)
}

// Demo client (for local development without Supabase)
export const demoSupabase = {
  from: (table) => ({
    select: () => Promise.resolve({ data: null, error: null }),
    insert: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
    update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: null, error: null }) }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) })
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } })
  }
}