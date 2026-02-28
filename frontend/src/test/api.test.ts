import { describe, it, expect, vi, beforeEach } from 'vitest'
import { boardApi, logsApi } from '../lib/api'

describe('Board API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch tasks from Go API', async () => {
    const mockTasks = [{ id: '1', title: 'Test Task', column_id: 'col-1', order: 0 }]

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockTasks)),
    } as unknown as Response)

    const { data, error } = await boardApi.getTasks(['col-1'])
    expect(error).toBeNull()
    expect(data).toEqual(mockTasks)
  })

  it('should create log entry through Go API', async () => {
    const mockLog = {
      id: 'log-1',
      agent_id: 'user-interface',
      level: 'SUCCESS',
      message: 'Task created',
      timestamp: new Date().toISOString(),
    }

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify(mockLog)),
    } as unknown as Response)

    const { data, error } = await logsApi.addLog({
      agent_id: 'user-interface',
      level: 'SUCCESS',
      message: 'Task created',
      metadata: { source: 'test' },
    })

    expect(error).toBeNull()
    expect(data?.id).toBe('log-1')
  })
})
