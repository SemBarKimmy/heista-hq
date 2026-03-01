export type AgentState = "off" | "idle" | "busy"

export interface AgentStatus {
  id: string
  name: string
  state: AgentState
  model: string
  currentTask: string
  reason: string
}

interface OpenClawAgent {
  id?: string
  name?: string
  status?: string
  state?: string
  model?: string
  taskId?: string | null
  currentTask?: string | null
  reason?: string | null
}

interface OpenClawAgentsPayload {
  source?: string
  updatedAt?: string
  agents?: OpenClawAgent[]
}

// Keep in sync with dashboard adapter fallback.
const REQUIRED_API_URL = "https://heistadev.danuseta.my.id"

function normalizeBaseUrl(input?: string) {
  const value = (input || "").trim()
  if (!value) return REQUIRED_API_URL
  return value.endsWith("/") ? value.slice(0, -1) : value
}

function getApiBaseUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL)
}

function toAgentState(value?: string): AgentState {
  const normalized = (value || "").toLowerCase()
  if (normalized === "busy") return "busy"
  if (normalized === "idle") return "idle"
  return "off"
}

function toCurrentTask(agent: OpenClawAgent): string {
  if (agent.currentTask && agent.currentTask.trim()) return agent.currentTask
  if (agent.taskId && String(agent.taskId).trim()) return `Task ${agent.taskId}`
  return "-"
}

function toReason(agent: OpenClawAgent, state: AgentState): string {
  if (agent.reason && agent.reason.trim()) return agent.reason
  if (state === "busy") return "Executing assigned task"
  if (state === "idle") return "No active task"
  return "Agent offline"
}

function normalizeAgent(agent: OpenClawAgent): AgentStatus {
  const state = toAgentState(agent.status || agent.state)
  const id = (agent.id || "unknown").toString()

  return {
    id,
    name: (agent.name || id).toString(),
    state,
    model: (agent.model || "unknown").toString(),
    currentTask: toCurrentTask(agent),
    reason: toReason(agent, state),
  }
}

export async function getAgentStatuses(fetcher: typeof fetch = fetch): Promise<AgentStatus[]> {
  const endpoint = process.env.AGENT_MONITORING_ENDPOINT || `${getApiBaseUrl()}/api/agents/status`

  try {
    const response = await fetcher(endpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("agent status fetch failed")

    const payload = (await response.json()) as OpenClawAgentsPayload | AgentStatus[]

    if (Array.isArray(payload)) {
      return payload.map((agent) => normalizeAgent(agent as OpenClawAgent))
    }

    return (payload.agents ?? []).map(normalizeAgent)
  } catch {
    return []
  }
}
