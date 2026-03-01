"use client"

import { Task } from "@/app/(dashboard)/tasks/page"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TaskColumnProps {
  tasks: Task[]
  status: "todo" | "in_progress" | "done"
  activeId: string | null
}

export function TaskColumn({ tasks, status, activeId }: TaskColumnProps) {
  const handleDeleteTask = async (taskId: string) => {
    try {
      // Note: For this MVP, we'll just mark as deleted locally
      // In production, you'd have a DELETE endpoint
      console.log("Delete task:", taskId)
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} isActive={activeId === task.id} onDelete={handleDeleteTask} />
      ))}
      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">Drop tasks here</div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  isActive: boolean
  onDelete: (taskId: string) => void
}

function TaskCard({ task, isActive, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={`cursor-move hover:shadow-md transition-shadow ${isActive ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm line-clamp-2 flex-1">{task.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        {task.description && (
          <CardContent className="pt-0">
            <CardDescription className="text-xs line-clamp-3">{task.description}</CardDescription>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
