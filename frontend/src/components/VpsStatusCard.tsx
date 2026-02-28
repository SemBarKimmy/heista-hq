"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getVpsStatus, type VpsStatusData, formatWibDateTime } from "@/lib/dashboard"

const POLL_MS = 15_000

export function VpsStatusCard({ initialData }: { initialData: VpsStatusData }) {
  const [data, setData] = React.useState<VpsStatusData>(initialData)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const next = await getVpsStatus(fetch)
      setData(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    const t = setInterval(() => {
      void refresh()
    }, POLL_MS)
    return () => clearInterval(t)
  }, [refresh])

  return (
    <Card className="md:col-span-3 md:row-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardDescription>VPS Status</CardDescription>
          <CardTitle className="uppercase tracking-wider">{data.status}</CardTitle>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <Badge variant="outline">CPU {data.cpuPercent}%</Badge>
          <Badge variant="outline">RAM {data.ramPercent}%</Badge>
          <Badge variant="outline">Disk {data.diskPercent}%</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.region} · uptime {data.uptimePercent}% · updated {formatWibDateTime(data.updatedAt)} WIB · source: {data.source}
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
