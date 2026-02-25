import { describe, it, expect, vi } from 'vitest'
import { boardApi } from '../lib/api'
import { supabase } from '../lib/supabase'

describe('Board API', () => {
  it('should fetch boards', async () => {
    const mockBoards = [{ id: '1', name: 'Test Board' }]
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: mockBoards, error: null })
    })
    
    // @ts-ignore
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect })

    const { data } = await boardApi.getBoards()
    expect(data).toEqual(mockBoards)
  })

  it('should add a task', async () => {
    const newTask = { title: 'New Task', column_id: 'col-1', order: 1 }
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'task-1', ...newTask }, error: null })
      })
    })

    // @ts-ignore
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert })

    const { data } = await boardApi.addTask(newTask)
    expect(data?.id).toBe('task-1')
  })
})
