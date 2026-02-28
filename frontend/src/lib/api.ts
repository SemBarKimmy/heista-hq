import { apiRequest } from './api-client'

export interface Task {
  id: string
  column_id: string
  title: string
  description?: string
  order: number
}

export interface AgentLog {
  id: string
  agent_id: string
  level: string
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
}

function unwrapArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: T[] }).data
  }
  return []
}

function unwrapObject<T>(payload: unknown): T | null {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return ((payload as { data?: T }).data ?? null) as T | null
  }
  return (payload as T) ?? null
}

async function toResult<T>(action: () => Promise<T>) {
  try {
    return { data: await action(), error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export const boardApi = {
  getTasks: async (columnIds: string[]) => {
    return toResult(async () => {
      const query = columnIds.length > 0 ? `?columnIds=${encodeURIComponent(columnIds.join(','))}` : ''
      const payload = await apiRequest<unknown>(`/api/tasks${query}`)
      return unwrapArray<Task>(payload)
    })
  },

  addTask: async (task: Omit<Task, 'id'>) => {
    return toResult(async () => {
      const payload = await apiRequest<unknown>('/api/tasks', {
        method: 'POST',
        body: task,
      })
      return unwrapObject<Task>(payload)
    })
  },

  updateTaskOrder: async (taskId: string, columnId: string, order: number) => {
    return toResult(async () => {
      const payload = await apiRequest<unknown>(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: { column_id: columnId, order },
      })
      return unwrapObject<Task>(payload)
    })
  },

  deleteTask: async (taskId: string) => {
    return toResult(async () => {
      const payload = await apiRequest<unknown>(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      return unwrapObject<Task>(payload)
    })
  },
}

export const logsApi = {
  getLogs: async (limit = 100) => {
    return toResult(async () => {
      const payload = await apiRequest<unknown>(`/api/logs?limit=${limit}`)
      return unwrapArray<AgentLog>(payload)
    })
  },

  addLog: async (log: Omit<AgentLog, 'id' | 'timestamp'>) => {
    return toResult(async () => {
      const payload = await apiRequest<unknown>('/api/logs', {
        method: 'POST',
        body: log,
      })
      return unwrapObject<AgentLog>(payload)
    })
  },
}
