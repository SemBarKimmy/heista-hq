"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2 } from "lucide-react"
import { TaskColumn } from "@/components/TaskColumn"
import { AddTaskDialog } from "@/components/AddTaskDialog"

export interface Task {
  id: string
  title: string
  description?: string
  status: "todo" | "in_progress" | "done"
  created_at: string
  updated_at: string
}

type ColumnType = "todo" | "in_progress" | "done"

const COLUMNS: Record<ColumnType, { title: string; color: string }> = {
  todo: { title: "To Do", color: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { title: "In Progress", color: "bg-blue-100 dark:bg-blue-900" },
  done: { title: "Done", color: "bg-green-100 dark:bg-green-900" },
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch tasks from Supabase via backend
  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tasks")
      if (!response.ok) throw new Error("Failed to fetch tasks")
      const data = await response.json()
      setTasks(data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async (title: string, description?: string) => {
    try {
      const newTask = {
        title,
        description,
        status: "todo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      })

      if (!response.ok) throw new Error("Failed to create task")
      const createdTask = await response.json()
      setTasks([...tasks, createdTask[0]])
      setIsAddingTask(false)
    } catch (error) {
      console.error("Error adding task:", error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    // Extract status from over id (format: "status-taskId" or just "status")
    const overData = String(over.id).split("-")
    const newStatus = overData[0] as ColumnType

    if (activeTask.status === newStatus && over.id === active.id) {
      return
    }

    // Update task status in local state
    const updatedTasks = tasks.map((t) =>
      t.id === activeTask.id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    )
    setTasks(updatedTasks)

    // Update in Supabase via backend
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...activeTask, status: newStatus, updated_at: new Date().toISOString() }),
      })

      if (!response.ok) {
        // Revert on error
        setTasks(tasks)
        throw new Error("Failed to update task")
      }
    } catch (error) {
      console.error("Error updating task:", error)
      setTasks(tasks) // Revert
    }
  }

  const getTasksByStatus = (status: ColumnType) => tasks.filter((t) => t.status === status)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Task Board</h1>
          <p className="text-muted-foreground mt-1">Manage your tasks across different stages</p>
        </div>
        <Button onClick={() => setIsAddingTask(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(COLUMNS) as Array<[ColumnType, typeof COLUMNS[ColumnType]]>).map(([status, column]) => (
            <div key={status} className={`rounded-lg p-4 min-h-96 ${column.color}`}>
              <h2 className="font-semibold text-lg mb-4 flex items-center justify-between">
                {column.title}
                <span className="text-sm bg-black/10 dark:bg-white/10 px-2 py-1 rounded">
                  {getTasksByStatus(status).length}
                </span>
              </h2>
              <SortableContext
                items={getTasksByStatus(status).map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <TaskColumn tasks={getTasksByStatus(status)} status={status} activeId={activeId} />
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

      <AddTaskDialog open={isAddingTask} onOpenChange={setIsAddingTask} onAdd={handleAddTask} />
    </div>
  )
}
