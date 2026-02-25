import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6enp6enp6enp6enp6enp6enp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MTExMTExMTEsImV4cCI6MjExMTExMTExMX0.dummy'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
