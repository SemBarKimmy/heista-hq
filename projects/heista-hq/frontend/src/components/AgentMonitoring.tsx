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
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    // Initial fetch
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('agent_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100)
      
      if (data && !error) {
        setLogs(data as Log[])
      }
    }

    fetchLogs()

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
      case 'error': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'success': return 'bg-primary/10 text-primary border-primary/20'
      default: return 'bg-secondary/10 text-secondary-foreground border-secondary/20'
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
    <div className="bg-card text-foreground h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Logs</h1>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
          Live
        </Badge>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="divide-y divide-border">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Waiting for logs...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3 flex gap-3 hover:bg-muted/50 transition-colors">
                <div className="text-muted-foreground text-[10px] font-mono pt-1 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0 ${getLevelColor(log.level)}`}>
                      {log.level}
                    </Badge>
                    <span className="text-primary text-xs font-mono font-semibold">{log.agent_id}</span>
                  </div>
                  <p className="text-xs text-foreground font-mono leading-relaxed break-words">{log.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
