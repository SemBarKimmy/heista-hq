import { AgentMonitoringBoard } from "@/components/AgentMonitoringBoard"
import { getAgentStatuses } from "@/lib/monitoring"

export const revalidate = 60

export default async function MonitorPage() {
  const agents = await getAgentStatuses()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Agent Monitoring</h1>
        <p className="text-muted-foreground">Status real-time agent: Off / Idle / Busy, model aktif, current task, dan reason.</p>
      </div>
      <AgentMonitoringBoard agents={agents} />
    </div>
  )
}
