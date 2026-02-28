"use client"

import React, { useState, useEffect } from "react"
import { logsApi } from "@/lib/api"
import { Terminal } from "lucide-react"

interface Log {
  id: string
  agent_id: string
  level: string
  message: string
  timestamp: string
}

const POLL_INTERVAL_MS = 5000

export function AgentMonitoring() {
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchLogs = async () => {
      const { data, error } = await logsApi.getLogs(100)
      if (!isMounted || error || !data) return
      setLogs(data as Log[])
    }

    fetchLogs()
    const intervalId = window.setInterval(fetchLogs, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex items-center gap-2">
        <Terminal className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Raw Terminal Logs</h2>
      </div>

      <div data-testid="agent-log-stream" className="bg-black text-green-400 font-mono text-xs min-h-[460px] max-h-[70vh] overflow-auto p-4 space-y-1">
        {logs.length === 0 ? (
          <p className="text-green-300/80">[waiting] no log stream yet...</p>
        ) : (
          logs.map((log) => (
            <p key={log.id}>
              <span className="text-green-200">[{new Date(log.timestamp).toLocaleString()}]</span>{" "}
              <span className="text-cyan-300">{log.agent_id}</span>{" "}
              <span className="text-yellow-300">{log.level}</span>{" "}
              {log.message}
            </p>
          ))
        )}
      </div>
    </section>
  )
}
