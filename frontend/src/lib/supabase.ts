import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL. Supabase client requires environment variables.')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase client requires environment variables.')
}

if (supabaseUrl.includes('localhost:54321')) {
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL: localhost:54321 is not allowed for UAT/deployment.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
