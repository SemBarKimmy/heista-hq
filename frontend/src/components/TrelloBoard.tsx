"use client"

import React, { useState, useEffect } from "react"
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, GripVertical, Check, X } from "lucide-react"
import { boardApi, logsApi } from "@/lib/api"
import { Input } from "@/components/ui/input"

interface Task {
  id: string
  title: string
  description?: string
  column_id: string
  order: number
}

interface Column {
  id: string
  title: string
  tasks: Task[]
}

let tempTaskCounter = 0

const INITIAL_COLUMNS: Column[] = [
  { id: "col-1", title: "To Do", tasks: [] },
  { id: "col-2", title: "In Progress", tasks: [] },
  { id: "col-3", title: "Done", tasks: [] },
]

const COLUMN_IDS = INITIAL_COLUMNS.map((column) => column.id)

export function TrelloBoard() {
  const [columns, setColumns] = useState<Column[]>(INITIAL_COLUMNS)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const logActivity = async (message: string, level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') => {
    const { error } = await logsApi.addLog({
      agent_id: 'user-interface',
      level,
      message,
      metadata: { source: 'TrelloBoard' }
    })

    if (error) {
      console.error("Failed to log activity:", error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await boardApi.getTasks(COLUMN_IDS)
      if (data && !error) {
        setColumns(prev => prev.map(col => ({
          ...col,
          tasks: data
            .filter((t) => t.column_id === col.id)
            .sort((a, b) => a.order - b.order)
        })))
      }
    }
    fetchData()
  }, [])

  const findColumn = (id: string) => {
    if (columns.some(col => col.id === id)) return columns.find(col => col.id === id)
    return columns.find(col => col.tasks.some(t => t.id === id))
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = columns.flatMap(c => c.tasks).find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumn(activeId)
    const overColumn = findColumn(overId)

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return

    setColumns(prev => {
      const activeItems = [...activeColumn.tasks]
      const overItems = [...overColumn.tasks]

      const activeIndex = activeItems.findIndex(t => t.id === activeId)
      const overIndex = overColumn.id === overId ? overItems.length : overItems.findIndex(t => t.id === overId)

      const [removed] = activeItems.splice(activeIndex, 1)
      removed.column_id = overColumn.id
      overItems.splice(overIndex, 0, removed)

      return prev.map(col => {
        if (col.id === activeColumn.id) return { ...col, tasks: activeItems }
        if (col.id === overColumn.id) return { ...col, tasks: overItems }
        return col
      })
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumn(activeId)
    const overColumn = findColumn(overId)

    if (!activeColumn || !overColumn) return

    if (activeId !== overId) {
      setColumns(prev => {
        const activeIndex = activeColumn.tasks.findIndex(t => t.id === activeId)
        const overIndex = overColumn.tasks.findIndex(t => t.id === overId)

        let newTasks = [...overColumn.tasks]
        if (activeColumn.id === overColumn.id) {
          newTasks = arrayMove(overColumn.tasks, activeIndex, overIndex)
        }

        return prev.map(col => {
          if (col.id === overColumn.id) return { ...col, tasks: newTasks }
          return col
        })
      })
    }

    // Sync to DB
    const finalCol = findColumn(activeId)
    if (finalCol) {
      const task = finalCol.tasks.find(t => t.id === activeId)
      const index = finalCol.tasks.findIndex(t => t.id === activeId)
      if (task) {
        await boardApi.updateTaskOrder(activeId, finalCol.id, index)
        logActivity(`Moved task "${task.title}" to ${finalCol.title}`, 'SUCCESS')
      }
    }
  }

  const addTask = async (columnId: string) => {
    if (!newTaskTitle.trim()) return

    const column = columns.find(c => c.id === columnId)
    if (!column) return

    const newTask = {
      title: newTaskTitle,
      column_id: columnId,
      order: column.tasks.length
    }

    // Optimistic update
    const tempId = `temp-${++tempTaskCounter}`
    const optimisticTask = { ...newTask, id: tempId }
    
    setColumns(prev => prev.map(col => {
      if (col.id === columnId) {
        return { ...col, tasks: [...col.tasks, optimisticTask] }
      }
      return col
    }))

    setNewTaskTitle("")
    setAddingToColumn(null)

    // API call
    const { data, error } = await boardApi.addTask(newTask)
    
    if (data && !error) {
      setColumns(prev => prev.map(col => {
        if (col.id === columnId) {
          return { ...col, tasks: col.tasks.map(t => t.id === tempId ? data : t) }
        }
        return col
      }))
      logActivity(`Added new task: "${data.title}"`, 'SUCCESS')
    } else {
      // Rollback on error
      setColumns(prev => prev.map(col => {
        if (col.id === columnId) {
          return { ...col, tasks: col.tasks.filter(t => t.id !== tempId) }
        }
        return col
      }))
      logActivity(`Failed to add task: ${error?.message}`, 'ERROR')
    }
  }

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto bg-muted/30 min-h-[500px]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {columns.map((column) => (
          <div key={column.id} className="w-80 flex-shrink-0">
            <Card className="bg-muted border-none shadow-none h-fit">
              <CardHeader className="p-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">{column.title}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setAddingToColumn(column.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <SortableContext
                  items={column.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 min-h-[10px]">
                    {column.tasks.map((task) => (
                      <SortableTask key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>
                
                {addingToColumn === column.id ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      autoFocus
                      placeholder="Enter task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTask(column.id)
                        if (e.key === "Escape") setAddingToColumn(null)
                      }}
                      className="bg-card text-sm h-9"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => addTask(column.id)} className="h-8">
                        <Check className="h-4 w-4 mr-1" /> Add
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setAddingToColumn(null)} className="h-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-muted-foreground text-xs hover:bg-accent h-8"
                      onClick={() => setAddingToColumn(column.id)}
                    >
                      <Plus className="h-3 w-3 mr-2" /> Add a card
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: "0.5",
              },
            },
          }),
        }}>
          {activeTask ? (
            <div className="bg-card p-3 rounded-md shadow-lg border border-border w-80">
              <p className="text-sm text-foreground">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function SortableTask({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card p-3 rounded-md shadow-sm border border-border group relative"
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab pt-1 text-muted-foreground opacity-0 group-hover:opacity-100">
           <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground">{task.title}</p>
        </div>
      </div>
    </div>
  )
}
