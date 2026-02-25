import { TrelloBoard } from "@/components/TrelloBoard"

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tasks Board</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Full kanban board untuk planning, eksekusi, dan tracking progress tim.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <TrelloBoard />
      </div>
    </div>
  )
}
