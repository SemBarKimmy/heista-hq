export type AgentState = "off" | "idle" | "busy"

export interface AgentStatus {
  id: string
  name: string
  state: AgentState
  model: string
  currentTask: string
  reason: string
}

export async function getAgentStatuses(fetcher: typeof fetch = fetch): Promise<AgentStatus[]> {
  const endpoint = process.env.AGENT_MONITORING_ENDPOINT

  if (!endpoint) {
    return [
      {
        id: "agent-arga",
        name: "Arga",
        state: "busy",
        model: "gpt-5.3-codex",
        currentTask: "Iterasi 8 - Monitoring & Feeds",
        reason: "Sedang implement page /monitor dan dashboard adapters",
      },
      {
        id: "agent-elisa",
        name: "Elisa",
        state: "idle",
        model: "gpt-5.3",
        currentTask: "Menunggu contract endpoint VPS status",
        reason: "Tidak ada task aktif sampai endpoint siap",
      },
      {
        id: "agent-andries",
        name: "Andries",
        state: "off",
        model: "gpt-5.3",
        currentTask: "-",
        reason: "Agent belum online",
      },
    ]
  }

  try {
    const response = await fetcher(endpoint, { cache: "no-store" })
    if (!response.ok) throw new Error("agent status fetch failed")
    return (await response.json()) as AgentStatus[]
  } catch {
    return []
  }
}
