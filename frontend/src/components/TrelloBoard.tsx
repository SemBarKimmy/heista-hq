"use client"

import React, { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { Input } from "@/components/ui/input"
import { Plus, Trash2, GripVertical } from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  column_id: string
}

interface Column {
  id: string
  title: string
  tasks: Task[]
}

export function TrelloBoard() {
  const [columns, setColumns] = useState<Column[]>([
    { id: "col-1", title: "To Do", tasks: [{ id: "task-1", title: "Setup Project", column_id: "col-1" }] },
    { id: "col-2", title: "In Progress", tasks: [] },
    { id: "col-3", title: "Done", tasks: [] },
  ])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      // Basic sorting logic (simplification for MVP)
      setColumns((items) => {
        // Find which column the task belongs to and reorder within it
        // Note: Cross-column drag needs more complex logic
        return items.map(col => {
          const taskIds = col.tasks.map(t => t.id)
          if (taskIds.includes(active.id as string)) {
            const oldIndex = taskIds.indexOf(active.id as string)
            const newIndex = taskIds.indexOf(over.id as string)
            return {
              ...col,
              tasks: arrayMove(col.tasks, oldIndex, newIndex)
            }
          }
          return col
        })
      })
    }
  }

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto bg-slate-50 min-h-screen">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {columns.map((column) => (
          <div key={column.id} className="w-80 flex-shrink-0">
            <Card className="bg-slate-100 border-none shadow-sm h-fit">
              <CardHeader className="p-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700">{column.title}</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <SortableContext
                  items={column.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {column.tasks.map((task) => (
                      <SortableTask key={task.id} task={task} />
                    ))}
                  </div>
                </SortableContext>
                <div className="mt-2">
                   <Button variant="ghost" className="w-full justify-start text-slate-500 text-xs hover:bg-slate-200 h-8">
                     <Plus className="h-3 w-3 mr-2" /> Add a card
                   </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
        <Button variant="outline" className="w-80 flex-shrink-0 bg-white/50 border-dashed">
          <Plus className="h-4 w-4 mr-2" /> Add another list
        </Button>
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
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-3 rounded-md shadow-sm border border-slate-200 group relative"
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab pt-1 text-slate-400 opacity-0 group-hover:opacity-100">
           <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-700">{task.title}</p>
        </div>
      </div>
    </div>
  )
}
