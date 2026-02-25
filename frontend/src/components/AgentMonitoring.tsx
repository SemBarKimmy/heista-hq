"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Terminal, AlertCircle, Info, CheckCircle2 } from "lucide-react"

interface Log {
  id: string
  agent_id: string
  level: string
  message: string
  timestamp: string
}

export function AgentMonitoring() {
  const [logs, setLogs] = useState<Log[]>([
    { id: "1", agent_id: "Arga", level: "info", message: "Starting iteration 4 monitoring", timestamp: new Date().toISOString() },
    { id: "2", agent_id: "Codex", level: "success", message: "Schema validated", timestamp: new Date().toISOString() },
  ])

  useEffect(() => {
    // Setup real-time subscription
    const channel = supabase
      .channel('agent-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as Log, ...prev].slice(0, 100))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-700 border-red-200'
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      default: return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return <AlertCircle className="h-4 w-4" />
      case 'success': return <CheckCircle2 className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-200">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Terminal className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agent Monitoring</h1>
              <p className="text-slate-400 text-sm">Real-time system logs and agent activity</p>
            </div>
          </div>
          <div className="flex gap-2">
             <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
               Live
             </Badge>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800 p-4">
            <CardTitle className="text-lg font-medium">System Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px] w-full">
              <div className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 flex gap-4 hover:bg-slate-800/50 transition-colors">
                    <div className="text-slate-500 text-xs font-mono pt-1 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold px-1.5 py-0 ${getLevelColor(log.level)}`}>
                          {log.level}
                        </Badge>
                        <span className="text-emerald-400 text-sm font-mono">{log.agent_id}</span>
                      </div>
                      <p className="text-sm text-slate-300 font-mono leading-relaxed">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
