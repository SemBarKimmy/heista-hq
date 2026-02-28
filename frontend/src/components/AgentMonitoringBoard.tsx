import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentStatus } from "@/lib/monitoring"

function stateBadgeClass(state: AgentStatus["state"]) {
  switch (state) {
    case "busy":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30"
    case "idle":
      return "bg-primary/10 text-primary border-primary/30"
    case "off":
      return "bg-muted text-muted-foreground border-border"
  }
}

export function AgentMonitoringBoard({ agents }: { agents: AgentStatus[] }) {
  if (!agents.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No monitoring data available.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.id}>
          <CardHeader className="space-y-2 pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <Badge variant="outline" className={stateBadgeClass(agent.state)}>
                {agent.state.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Model: {agent.model}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current task</p>
              <p>{agent.currentTask}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reason</p>
              <p>{agent.reason}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
