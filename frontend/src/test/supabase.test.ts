import { describe, it, expect } from 'vitest'
import { supabase } from '../lib/supabase'

describe('Supabase Client Setup', () => {
  it('should be initialized', () => {
    expect(supabase).toBeDefined()
    expect(supabase.from).toBeTypeOf('function')
  })
})
