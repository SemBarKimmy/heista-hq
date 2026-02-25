import { AgentMonitoring } from "@/components/AgentMonitoring"

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Agent Logs</h1>
        <p className="text-muted-foreground">Real-time activity and system events from your agents.</p>
      </div>
      <AgentMonitoring />
    </div>
  )
}
