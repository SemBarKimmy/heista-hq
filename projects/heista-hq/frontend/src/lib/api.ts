import { supabase } from './supabase'

export interface Board {
  id: string
  name: string
}

export interface Column {
  id: string
  title: string
  order: number
}

export interface Task {
  id: string
  column_id: string
  title: string
  description?: string
  order: number
}

export const boardApi = {
  getBoards: async () => {
    const { data, error } = await supabase.from('boards').select('*').order('created_at')
    return { data, error }
  },
  
  getColumns: async (boardId: string) => {
    const { data, error } = await supabase.from('columns').select('*').eq('board_id', boardId).order('order')
    return { data, error }
  },

  getTasks: async (columnIds: string[]) => {
    const { data, error } = await supabase.from('tasks').select('*').in('column_id', columnIds).order('order')
    return { data, error }
  },

  addTask: async (task: Omit<Task, 'id'>) => {
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    return { data, error }
  },

  updateTaskOrder: async (taskId: string, columnId: string, order: number) => {
    const { data, error } = await supabase.from('tasks').update({ column_id: columnId, order }).eq('id', taskId)
    return { data, error }
  }
}
