import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const cloudConfigured = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('PROJE_KODUNUZ'))

export const supabase = cloudConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim() || window.location.origin

